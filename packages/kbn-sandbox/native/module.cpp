#include <v8.h>
#include <node.h>
#include <stdio.h>

#include "sandbox.hpp"

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;
using v8::Boolean;

void Activate(const FunctionCallbackInfo<Value>& args) {
  Sandbox::Result r = Sandbox::activate();

  Isolate* isolate = args.GetIsolate();
  // return { success: bool, message: string } based on Sandbox::Result
  Local<Object> result = Object::New(isolate);
  result->Set(String::NewFromUtf8(isolate, "success"), Boolean::New(isolate, r.success));
  result->Set(String::NewFromUtf8(isolate, "message"), String::NewFromUtf8(isolate, r.message.c_str()));
  args.GetReturnValue().Set(result);
}

void init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "activate", Activate);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, init)
