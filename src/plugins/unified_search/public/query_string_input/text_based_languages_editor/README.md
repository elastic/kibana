# Unified search text based languages editor

A **monaco** based editor that is part of the unified search experience. It is rendered for all the applications that support text-based languages.
In order to enable text based languages on your unified search bar add `textBasedLanguages: ['SQL', 'ESQL', '...']` to the dataViewPicker properties. 


## Languages supported
- SQL: based on the Elasticsearch sql api


## Features
- The editor operates in 3 modes: 
  - The inline mode: This is the one liner compact mode. If the query is large or consists of >1 lines then the user can't see the entire query.
  - The inline focused mode. The editor is transferred to this mode automatically when the user clicks on the above mode. On this mode the user can work with multiple lines, see the entire context, see the errors, the editor line numbers and interact with the editor on a compact way. The editor returns automatically to the inline mode when the user clicks outside the editor.
  - The expanded mode: The user has to click the maximize button to use this mode. Here the user has more space and can also minimize/maximize the editor height with a drag and drop experience.
- The editor has a built in way to depict the errors but the user has to submit the query first. The error should be on the inline focuses mode or the expanded mode to view the errors details.
- The editor is responsive regardless of the mode selected.
- The editor has a built in documentation that dynamically changes based on the language of the query.
- The user can quickly submit the query by pressing CMD/CTRL + Enter.

## Preview
Run `node scripts/storybook unified_search` for a preview of the unified search bar with the editor.

## Component properties
The editor is imported to the query_bar_top_row.tsx file. Accepts the following properties:
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
  onTextLangQuerySubmit={() =>
    onSubmit({
      query: queryRef.current,
      dateRange: dateRangeRef.current,
    })
 }
 />
```
