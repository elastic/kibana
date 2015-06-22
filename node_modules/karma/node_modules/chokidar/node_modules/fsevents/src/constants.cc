/*
** © 2014 by Philipp Dunkel <pip@pipobscure.com>
** Licensed under MIT License.
*/

// constants from https://developer.apple.com/library/mac/documentation/Darwin/Reference/FSEvents_Ref/index.html#//apple_ref/doc/constant_group/FSEventStreamEventFlags
#ifndef kFSEventStreamEventFlagNone
#define kFSEventStreamEventFlagNone 0x00000000
#endif

#ifndef kFSEventStreamEventFlagMustScanSubDirs
#define kFSEventStreamEventFlagMustScanSubDirs 0x00000001
#endif

#ifndef kFSEventStreamEventFlagUserDropped
#define kFSEventStreamEventFlagUserDropped 0x00000002
#endif

#ifndef kFSEventStreamEventFlagKernelDropped
#define kFSEventStreamEventFlagKernelDropped 0x00000004
#endif

#ifndef kFSEventStreamEventFlagEventIdsWrapped
#define kFSEventStreamEventFlagEventIdsWrapped 0x00000008
#endif

#ifndef kFSEventStreamEventFlagHistoryDone
#define kFSEventStreamEventFlagHistoryDone 0x00000010
#endif

#ifndef kFSEventStreamEventFlagRootChanged
#define kFSEventStreamEventFlagRootChanged 0x00000020
#endif

#ifndef kFSEventStreamEventFlagMount
#define kFSEventStreamEventFlagMount 0x00000040
#endif

#ifndef kFSEventStreamEventFlagUnmount
#define kFSEventStreamEventFlagUnmount 0x00000080
#endif

#ifndef kFSEventStreamEventFlagItemCreated
#define kFSEventStreamEventFlagItemCreated 0x00000100
#endif

#ifndef kFSEventStreamEventFlagItemRemoved
#define kFSEventStreamEventFlagItemRemoved 0x00000200
#endif

#ifndef kFSEventStreamEventFlagItemInodeMetaMod
#define kFSEventStreamEventFlagItemInodeMetaMod 0x00000400
#endif

#ifndef kFSEventStreamEventFlagItemRenamed
#define kFSEventStreamEventFlagItemRenamed 0x00000800
#endif

#ifndef kFSEventStreamEventFlagItemModified
#define kFSEventStreamEventFlagItemModified 0x00001000
#endif

#ifndef kFSEventStreamEventFlagItemFinderInfoMod
#define kFSEventStreamEventFlagItemFinderInfoMod 0x00002000
#endif

#ifndef kFSEventStreamEventFlagItemChangeOwner
#define kFSEventStreamEventFlagItemChangeOwner 0x00004000
#endif

#ifndef kFSEventStreamEventFlagItemXattrMod
#define kFSEventStreamEventFlagItemXattrMod 0x00008000
#endif

#ifndef kFSEventStreamEventFlagItemIsFile
#define kFSEventStreamEventFlagItemIsFile 0x00010000
#endif

#ifndef kFSEventStreamEventFlagItemIsDir
#define kFSEventStreamEventFlagItemIsDir 0x00020000
#endif

#ifndef kFSEventStreamEventFlagItemIsSymlink
#define kFSEventStreamEventFlagItemIsSymlink 0x00040000
#endif

static v8::Local<v8::Object> Constants() {
  NanEscapableScope();
  v8::Local<v8::Object> object = NanNew<v8::Object>();
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagNone"), NanNew<v8::Integer>(kFSEventStreamEventFlagNone));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagMustScanSubDirs"), NanNew<v8::Integer>(kFSEventStreamEventFlagMustScanSubDirs));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagUserDropped"), NanNew<v8::Integer>(kFSEventStreamEventFlagUserDropped));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagKernelDropped"), NanNew<v8::Integer>(kFSEventStreamEventFlagKernelDropped));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagEventIdsWrapped"), NanNew<v8::Integer>(kFSEventStreamEventFlagEventIdsWrapped));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagHistoryDone"), NanNew<v8::Integer>(kFSEventStreamEventFlagHistoryDone));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagRootChanged"), NanNew<v8::Integer>(kFSEventStreamEventFlagRootChanged));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagMount"), NanNew<v8::Integer>(kFSEventStreamEventFlagMount));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagUnmount"), NanNew<v8::Integer>(kFSEventStreamEventFlagUnmount));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemCreated"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemCreated));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemRemoved"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemRemoved));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemInodeMetaMod"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemInodeMetaMod));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemRenamed"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemRenamed));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemModified"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemModified));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemFinderInfoMod"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemFinderInfoMod));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemChangeOwner"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemChangeOwner));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemXattrMod"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemXattrMod));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemIsFile"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemIsFile));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemIsDir"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemIsDir));
  object->Set(NanNew<v8::String>("kFSEventStreamEventFlagItemIsSymlink"), NanNew<v8::Integer>(kFSEventStreamEventFlagItemIsSymlink));
  return NanEscapeScope(object);
}
