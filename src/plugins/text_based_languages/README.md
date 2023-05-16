# @kbn/text-based-languages

## Component properties
The editor accepts the following properties:
- query: This is the **AggregateQuery** query. i.e. (`{sql: SELECT * FROM 'DATAVIEW1'}`)
- onTextLangQueryChange: callback that is called every time the query is updated
- expandCodeEditor: flag that opens the editor on the expanded mode
- errors: array of `Error`.
- onTextLangQuerySubmit: callback that is called when the user submits the query

```
 <TextBasedLanguagesEditor
  query={props.query}
  onTextLangQueryChange={props.onTextLangQueryChange}
  expandCodeEditor={(status: boolean) => setCodeEditorIsExpanded(status)}
  isCodeEditorExpanded={codeEditorIsExpanded}
  errors={props.textBasedLanguageModeErrors}
  isDisabled={false}
  isDarkMode={false}
  onTextLangQuerySubmit={() =>
    onSubmit({
      query: queryRef.current,
      dateRange: dateRangeRef.current,
    })
 }
 />
```