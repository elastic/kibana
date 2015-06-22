/*
** © 2014 by Philipp Dunkel <pip@pipobscure.com>
** Licensed under MIT License.
*/

void FSEvents::emitEvent(const char *path, UInt32 flags, UInt64 id) {
  if (!handler) return;
  NanScope();
  v8::Local<v8::Value> argv[] = {
    NanNew<v8::String>(path),
    NanNew<v8::Number>(flags),
    NanNew<v8::Number>(id)
  };
  handler->Call(3, argv);
}

NAN_METHOD(FSEvents::New) {
  NanScope();

  NanUtf8String *path = new NanUtf8String(args[0]);
  NanCallback *callback = new NanCallback(args[1].As<v8::Function>());

  FSEvents *fse = new FSEvents(**path, callback);
  fse->Wrap(args.This());

  NanReturnValue(args.This());
}

NAN_METHOD(FSEvents::Stop) {
  NanScope();

  FSEvents* fse = node::ObjectWrap::Unwrap<FSEvents>(args.This());

  fse->threadStop();
  fse->asyncStop();

  NanReturnValue(args.This());
}

NAN_METHOD(FSEvents::Start) {
  NanScope();

  FSEvents* fse = node::ObjectWrap::Unwrap<FSEvents>(args.This());
  fse->asyncStart();
  fse->threadStart();

  NanReturnValue(args.This());
}
