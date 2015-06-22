/*
** © 2014 by Philipp Dunkel <pip@pipobscure.com>
** Licensed under MIT License.
*/


void async_propagate(uv_async_t *async) {
  if (!async->data) return;
  FSEvents *fse = (FSEvents *)async->data;
  CFIndex idx, cnt;
  fse_event *event;
  char pathbuf[1024];
  const char *pathptr = NULL;
  fse->lock();
  cnt = CFArrayGetCount(fse->events);
  for (idx=0; idx<cnt; idx++) {
    event = (fse_event *)CFArrayGetValueAtIndex(fse->events, idx);
    pathptr = CFStringGetCStringPtr(event->path, kCFStringEncodingUTF8);
    if (!pathptr) CFStringGetCString(event->path, pathbuf, 1024, kCFStringEncodingUTF8);
    fse->emitEvent(pathptr ? pathptr : pathbuf, event->flags, event->id);
  }
  if (cnt>0) CFArrayRemoveAllValues(fse->events);
  fse->unlock();
}

void FSEvents::asyncStart() {
  if (async.data == this) return;
  async.data = this;
  uv_async_init(uv_default_loop(), &async, (uv_async_cb) async_propagate);
}

void FSEvents::asyncTrigger() {
  if (async.data != this) return;
  uv_async_send(&async);
}

void FSEvents::asyncStop() {
  if (async.data != this) return;
  async.data = NULL;
  uv_close((uv_handle_t *) &async, NULL);
}
