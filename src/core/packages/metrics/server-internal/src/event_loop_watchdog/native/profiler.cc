/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */


#include <node.h>
#include <v8-profiler.h>

#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace watchdog {
using v8::CpuProfiler;
using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;

struct Target {
  std::mutex mutex;
  Isolate* isolate;
  CpuProfiler* profiler;
  v8::ProfilerId active = 0;
  uint64_t generation = 0;
};

struct Request {
  std::shared_ptr<Target> target;
  uint64_t generation;
  bool start;
  std::mutex mutex;
  bool done = false;
  std::string error;
  std::string json;
};

struct Binding {
  Isolate* isolate;
  std::vector<uint32_t> owned;
  std::unordered_map<uint32_t, std::shared_ptr<Request>> requests;
};

std::mutex registry_mutex;
std::unordered_map<uint32_t, std::shared_ptr<Target>> targets;
std::atomic<uint32_t> next_id{1};

void Fail(Isolate* isolate, const char* message) {
  isolate->ThrowException(v8::Exception::Error(
      String::NewFromUtf8(isolate, message).ToLocalChecked()));
}

Binding* Current(const FunctionCallbackInfo<Value>& args) {
  return static_cast<Binding*>(args.Data().As<v8::External>()->Value());
}

std::shared_ptr<Target> Lookup(uint32_t id) {
  std::lock_guard<std::mutex> lock(registry_mutex);
  auto found = targets.find(id);
  return found == targets.end() ? nullptr : found->second;
}

uint32_t Id(const FunctionCallbackInfo<Value>& args) {
  return args[0]->Uint32Value(args.GetIsolate()->GetCurrentContext()).FromMaybe(0);
}

void Stop(Target& target) {
  if (!target.active) return;
  auto* profile = target.profiler->Stop(target.active);
  target.active = 0;
  if (profile) profile->Delete();
}

void Close(uint32_t id, Isolate* isolate) {
  auto target = Lookup(id);
  if (!target) return;
  {
    std::lock_guard<std::mutex> lock(target->mutex);
    if (target->isolate != isolate) return;
    ++target->generation;
    Stop(*target);
    target->profiler->Dispose();
    target->profiler = nullptr;
    target->isolate = nullptr;
  }
  std::lock_guard<std::mutex> lock(registry_mutex);
  targets.erase(id);
}

void Cleanup(void* data) {
  auto* binding = static_cast<Binding*>(data);
  for (auto id : binding->owned) Close(id, binding->isolate);
  delete binding;
}

class JsonStream : public v8::OutputStream {
 public:
  std::string json;
  bool overflow = false;
  void EndOfStream() override {}
  WriteResult WriteAsciiChunk(char* data, int size) override {
    if (json.size() + size > 16 * 1024 * 1024) {
      overflow = true;
      return kAbort;
    }
    json.append(data, size);
    return kContinue;
  }
};

// Never call JavaScript or create JS handles in an interrupt callback.
void Interrupt(Isolate*, void* data) {
  std::unique_ptr<std::shared_ptr<Request>> payload(
      static_cast<std::shared_ptr<Request>*>(data));
  auto request = *payload;
  auto target = request->target;
  std::string error;
  std::string json;
  {
    std::lock_guard<std::mutex> lock(target->mutex);
    if (!target->profiler || request->generation != target->generation) {
      error = "Native capture cancelled";
    } else if (request->start) {
      if (target->active) {
        error = "Native capture already active";
      } else {
        auto result = target->profiler->Start(
            v8::CpuProfilingOptions(v8::kLeafNodeLineNumbers, 2000));
        if (result.status != v8::CpuProfilingStatus::kStarted) {
          error = "V8 refused native capture";
        } else {
          target->active = result.id;
        }
      }
    } else if (!target->active) {
      error = "No native capture active";
    } else {
      auto* profile = target->profiler->Stop(target->active);
      target->active = 0;
      if (!profile) {
        error = "V8 returned no profile";
      } else {
        JsonStream stream;
        profile->Serialize(&stream);
        profile->Delete();
        if (stream.overflow) error = "Native profile exceeds 16 MiB";
        else json = std::move(stream.json);
      }
    }
  }
  std::lock_guard<std::mutex> lock(request->mutex);
  request->error = std::move(error);
  request->json = std::move(json);
  request->done = true;
}

void Initialize(const FunctionCallbackInfo<Value>& args) {
  auto* isolate = args.GetIsolate();
  int interval = args[0]->Int32Value(isolate->GetCurrentContext()).FromMaybe(0);
  if (interval < 1000 || interval > 1000000) {
    return Fail(isolate, "Sampling interval must be 1000..1000000 us");
  }
  // Lazy mode is only a benchmark control for the same bridge.
  bool eager = args.Length() < 2 || args[1]->BooleanValue(isolate);
  auto target = std::make_shared<Target>();
  target->isolate = isolate;
  target->profiler = CpuProfiler::New(
      isolate, v8::kDebugNaming, eager ? v8::kEagerLogging : v8::kLazyLogging);
  target->profiler->SetSamplingInterval(interval);
  auto id = next_id++;
  {
    std::lock_guard<std::mutex> lock(registry_mutex);
    targets.emplace(id, target);
  }
  Current(args)->owned.push_back(id);
  args.GetReturnValue().Set(id);
}

void Enqueue(const FunctionCallbackInfo<Value>& args) {
  auto* isolate = args.GetIsolate();
  auto* binding = Current(args);
  if (binding->requests.size() >= 32) {
    return Fail(isolate, "Too many pending native requests");
  }
  auto target = Lookup(Id(args));
  if (!target) return Fail(isolate, "Unknown native profiler");
  auto request = std::make_shared<Request>();
  request->target = target;
  request->start = args[1]->BooleanValue(isolate);
  {
    std::lock_guard<std::mutex> lock(target->mutex);
    if (!target->isolate) return Fail(isolate, "Native profiler disposed");
    request->generation = target->generation;
    // The payload owns its target until the callback finishes, including disposal races.
    target->isolate->RequestInterrupt(
        Interrupt, new std::shared_ptr<Request>(request));
  }
  auto id = next_id++;
  binding->requests.emplace(id, request);
  args.GetReturnValue().Set(id);
}

void Poll(const FunctionCallbackInfo<Value>& args) {
  auto* isolate = args.GetIsolate();
  auto* binding = Current(args);
  auto found = binding->requests.find(Id(args));
  if (found == binding->requests.end()) return Fail(isolate, "Unknown native request");
  auto request = found->second;
  std::lock_guard<std::mutex> lock(request->mutex);
  if (!request->done) return;
  binding->requests.erase(found);
  if (!request->error.empty()) return Fail(isolate, request->error.c_str());
  args.GetReturnValue().Set(
      String::NewFromUtf8(isolate, request->json.data(),
                         v8::NewStringType::kNormal, request->json.size())
          .ToLocalChecked());
}

void Cancel(const FunctionCallbackInfo<Value>& args) {
  auto* isolate = args.GetIsolate();
  auto target = Lookup(Id(args));
  if (!target) return;
  std::lock_guard<std::mutex> lock(target->mutex);
  if (target->isolate != isolate) {
    return Fail(isolate, "Only the owning isolate may cancel");
  }
  ++target->generation;
  Stop(*target);
}

void Dispose(const FunctionCallbackInfo<Value>& args) {
  auto* isolate = args.GetIsolate();
  auto id = Id(args);
  auto target = Lookup(id);
  if (target) {
    std::lock_guard<std::mutex> lock(target->mutex);
    if (target->isolate != isolate) {
      return Fail(isolate, "Only the owning isolate may dispose");
    }
  }
  Close(id, isolate);
}

void Init(Local<Object> exports, Local<Value>, Local<v8::Context> context, void*) {
  auto* isolate = context->GetIsolate();
  auto* binding = new Binding{isolate, {}, {}};
  node::AddEnvironmentCleanupHook(isolate, Cleanup, binding);
  auto data = v8::External::New(isolate, binding);
  const std::pair<const char*, v8::FunctionCallback> methods[] = {
      {"initialize", Initialize}, {"request", Enqueue}, {"poll", Poll},
      {"cancel", Cancel}, {"dispose", Dispose}};
  for (const auto& method : methods) {
    exports->Set(context, String::NewFromUtf8(isolate, method.first).ToLocalChecked(),
                 v8::Function::New(context, method.second, data).ToLocalChecked())
        .Check();
  }
}
NODE_MODULE_CONTEXT_AWARE(NODE_GYP_MODULE_NAME, Init)
}  // namespace watchdog
