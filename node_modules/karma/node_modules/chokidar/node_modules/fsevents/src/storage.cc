/*
 ** © 2014 by Philipp Dunkel <pip@pipobscure.com>
 ** Licensed under MIT License.
 */

struct fse_event {
  UInt64 id;
  UInt32 flags;
  CFStringRef path;
};
typedef struct fse_event fse_event;

const void * FSEventRetain(CFAllocatorRef allocator, const void * ptr) {
  fse_event * orig = (fse_event * ) ptr;
  fse_event * copy = (fse_event * ) CFAllocatorAllocate(allocator, sizeof(fse_event), 0);
  copy->id = orig->id;
  copy->flags = orig->flags;
  copy->path = orig->path;
  CFRetain(copy->path);
  return copy;
}
void FSEventRelease(CFAllocatorRef allocator, const void * ptr) {
  fse_event * evt = (fse_event * ) ptr;
  CFRelease(evt->path);
  CFAllocatorDeallocate(allocator, evt);
}
const CFArrayCallBacks FSEventArrayCallBacks = {
  0, FSEventRetain, FSEventRelease, 0, 0
};
