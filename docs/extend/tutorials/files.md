---
navigation_title: "Files"
description: "Store and download blobs from a Kibana plugin using the files service."
---

# Files [files-plugin]

The files plugin is blob storage for Kibana plugins: create file metadata, upload content, and download through scoped HTTP APIs.

The default blob store is Elasticsearch. The service optimizes how ES is used for blobs, but ES is not a blob store by design. Report performance problems if you see them.

::::{note}
The service does not encrypt contents at rest and does not compress blobs. Files live in a system index. Plugins can still expose contents over HTTP, so only enable the actions you need and do not store secrets in files.
::::

## Files and Saved Objects

A file is Saved Object metadata plus a separate blob. Create the metadata first (the upload target), then upload content.

File contents are immutable. After upload, clients should download once and cache. To change contents, create a new file.

Consumers can attach JSON-serializable custom metadata and search it for tagging and filtering.

## Set up files

Examples below follow [`examples/files_example`](https://github.com/elastic/kibana/tree/main/examples/files_example).

### Depend on the plugin

Add `files` to `requiredPlugins` in `kibana.jsonc`.

### Declare a file kind

A file kind is one use case (for example user avatars). Register the full kind on the **server** — that is where HTTP privilege tags and size limits are enforced. Register a browser subset (`id`, `allowedMimeTypes`, and `maxSizeBytes`) on the **client**. The upload UI uses the browser `maxSizeBytes`; if you omit it, the picker defaults to 4 MiB even when the server allows more.

```ts
import type { FileKind } from '@kbn/files-plugin/common';

export const PLUGIN_ID = 'filesExample';

const httpTags = {
  requiredPrivileges: [PLUGIN_ID],
};

export const exampleFileKind: FileKind = {
  id: PLUGIN_ID,
  maxSizeBytes: 8 * 1024 * 1024,
  allowedMimeTypes: ['image/png', 'image/jpeg'],
  http: {
    create: httpTags,
    delete: httpTags,
    download: httpTags,
    getById: httpTags,
    list: httpTags,
  },
};
```

Only list the HTTP actions you need. `httpTags.requiredPrivileges` become `access:` privileges — grant those privileges to the users who must reach the files.

### Register the file kind

```ts
// server
public setup(core: CoreSetup, { files }: { files: FilesSetup }) {
  files.registerFileKind(exampleFileKind);
}

// browser — FileKindBrowser only
public setup(core: CoreSetup, { files }: { files: FilesSetup }) {
  files.registerFileKind({
    id: exampleFileKind.id,
    allowedMimeTypes: exampleFileKind.allowedMimeTypes,
    maxSizeBytes: exampleFileKind.maxSizeBytes,
  });
}
```

### Use the file client

Browser start uses `filesClientFactory`. The HTTP client is scoped to one kind:

```ts
const client = files.filesClientFactory.asScoped('filesExample');
const result = await client.list();

const { file } = await client.create({
  name: 'my_file',
  meta: { myValue: 'test' },
  mimeType: 'image/png',
});

await client.upload({ id: file.id, body: blob });
```

Server start uses `fileServiceFactory`. `asInternal()` does not go through HTTP ACLs and has unrestricted access to that kind:

```ts
const fileService = files.fileServiceFactory.asInternal();
const file = await fileService.create({
  fileKind: 'filesExample',
  name: 'my_file',
  meta: { myValue: 'test' },
  mime: 'image/png',
});

await file.uploadContent(readable);
```

## UI components

Shared file UI lives in `@kbn/shared-ux-file-*` packages. Wrap the tree in `FilesContext` with an unscoped client:

```tsx
import { FilesContext } from '@kbn/shared-ux-file-context';
import { FilePicker } from '@kbn/shared-ux-file-picker';
import { FileUpload } from '@kbn/shared-ux-file-upload';
import { FileImage as Image } from '@kbn/shared-ux-file-image';

const client = files.filesClientFactory.asUnscoped();

<FilesContext client={client}>
  <FilePicker kind="filesExample" onDone={onDone} />
  <FileUpload kind="filesExample" onDone={onDone} />
  <Image src={client.getDownloadHref({ id, fileKind: 'filesExample' })} alt="..." />
</FilesContext>
```

See [`examples/files_example`](https://github.com/elastic/kibana/tree/main/examples/files_example) and the public contracts in `public/index.ts` and `server/index.ts`.
