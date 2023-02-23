### Shareable language documentation popover

This is a stateless shareable component that can be used to render documentation for a language as a popover.

It can be used in every application that would like to add an in-app documentation. The component consists of:
- A sidebar navigation with a search
- A details page

```
<LanguageDocumentationPopover language={language} sections={documentationSections} />
```

The properties are typed as:

```
 export interface LanguageDocumentationSections {
  groups: Array<{
    label: string;
    description?: string;
    items: Array<{ label: string; description?: JSX.Element }>;
  }>;
  initialSection: JSX.Element;
}
```