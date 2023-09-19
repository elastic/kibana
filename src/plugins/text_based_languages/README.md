# @kbn/text-based-languages

## Component properties
The editor accepts the following properties:
- query: This is the **AggregateQuery** query. i.e. (`{esql: from index1 | limit 10}`)
- onTextLangQueryChange: callback that is called every time the query is updated
- expandCodeEditor: flag that opens the editor on the expanded mode
- errors: array of `Error`.
- onTextLangQuerySubmit: callback that is called when the user submits the query
```

To use it on your application, you need to add the textBasedLanguages to your requiredBundles and the @kbn/text-based-languages to your tsconfig.json and use the component like that:
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';

 <TextBasedLangEditor
  query={query}
  onTextLangQueryChange={onTextLangQueryChange}
  expandCodeEditor={(status: boolean) => setCodeEditorIsExpanded(status)}
  isCodeEditorExpanded={codeEditorIsExpandedFlag}
  errors={props.textBasedLanguageModeErrors}
  isDisabled={false}
  onTextLangQuerySubmit={onTextLangQuerySubmit}
 />
```

## Usage so far
The TextBasedLanguagesEditor is currently part of the unified search component. 
If your application uses the dataview picker then it can be enabled by adding

```
textBasedLanguages: ['ESQL'],
```

om the dataViewPickerProps property.