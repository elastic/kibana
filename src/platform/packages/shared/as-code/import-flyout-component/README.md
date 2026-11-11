# @kbn/as-code-import-flyout-component

Shared UI component for importing as-code state from a JSON file.

Dashboard is the first consumer. Other as-code applications can reuse
`ImportJsonFlyoutContent` by providing application-specific sanitization, creation, strings, and
success behavior.

The `services` prop uses the Core `ApplicationStart` and `NotificationsStart` contracts directly,
so consumers pass the corresponding Core start services without duplicating Core contracts.

```tsx
<ImportJsonFlyoutContent<MyState>
  title="Import object"
  titleId="import-object-title"
  closeFlyout={closeFlyout}
  dataTestSubjPrefix="importObject"
  exportApplication="My application"
  services={core}
  serverValidationError="The file could not be imported."
  sanitizeImportJson={sanitizeImportJson}
  createFromJson={createFromJson}
  onImportSuccess={onImportSuccess}
/>
```

The component:

- accepts `.json` files up to a client-side limit of 1 MiB;
- parses JSON and passes the untrusted value to `sanitizeImportJson`;
- aborts an in-flight sanitization when the file changes or the flyout unmounts;
- displays sanitization warnings and related items without blocking import; and
- passes only the sanitized state to `createFromJson`.

Optional props enable the technical-preview badge and application-specific warning summary. This
follows the same adapter pattern as `@kbn/as-code-export-flyout-component`.

## Building blocks

Consumers that render the import inside their own layout (for example a tab of an existing flyout)
can compose the same pieces:

- `useImportJsonFlyoutState` holds the validation and import state. `onFileChange` validates a file
  right away and `onTextChange` validates pasted text once the user pauses typing.
- `ImportJsonEditor` accepts pasted or typed JSON, a dropped file, or a file chosen with its upload link;
  a file is loaded into the editor. Use `label` to describe what the JSON contains.
- `ImportJsonServerErrorCallout` and `ImportJsonWarningsCallout` show sanitization results.

`sanitizeImportJson` can throw `ImportJsonValidationError` to show a message next to the input instead of 
the generic server error. It can also mark related items with `isMissing` after checking them: 
missing items get their own summary and items that exist are not listed.
