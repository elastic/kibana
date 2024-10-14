### Shareable language documentation

This is a stateless shareable component that can be used to render documentation for a language as a popover, flyour or a React component that you can add in your applications as you wish.

It can be used in every application that would like to add an in-app documentation. The component consists of:
- A sidebar navigation with a search
- A details page

### As a popover (currently used for Lens formulas)

```
<LanguageDocumentationPopover language={language} sections={documentationSections} onHelpMenuVisibilityChange={onHelpMenuVisibilityChange} isHelpMenuOpen={isHelpMenuOpen} />
```

### As a flyout (currently used for ES|QL in unified search)

```
<LanguageDocumentationFlyout linkToDocumentation={docLinks?.links?.query?.queryESQL ?? ''} isHelpMenuOpen={isLanguageComponentOpen} onHelpMenuVisibilityChange={setIsLanguageComponentOpen} />
```

### As an inline component (currently used for ES|QL in Lens inline editing, alerts)

```
<LanguageDocumentationInline />
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