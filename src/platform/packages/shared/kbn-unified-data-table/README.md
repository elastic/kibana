# @kbn/unified-data-table

This package contains components and services for the unified data table UI (as used in Discover).

## UnifiedDataTable Component
Props description:
| Property | Type | Description |
| :---   | :--- | :--- |
| **ariaLabelledBy** | string | Determines which element labels the grid for ARIA. |
| **className** | (optional) string | Optional class name to apply. |
| **columns** | string[] | Determines ids of the columns which are displayed. |
| **expandedDoc** | (optional) DataTableRecord  | If set, the given document is displayed in a flyout. |
| **enableInTableSearch** | (optional) boolean  | Set to true to allow users to search inside the table. |
| **dataView** | DataView | The used data view. |
| **loadingState** | DataLoadingState | Determines if data is currently loaded. |
| **onFilter** | DocViewFilterFn | Function to add a filter in the grid cell or document flyout. |
| **onResize** | (optional)(colSettings: { columnId: string; width: number | undefind }) => void; | Function triggered when a column is resized by the user, passes `undefined` for auto-width. |
| **onSetColumns** | (columns: string[], hideTimeColumn: boolean) => void; | Function to set all columns. |
| **onSort** | (optional)(sort: string[][]) => void; | Function to change sorting of the documents, skipped when isSortEnabled is set to false. |
| **rows** | (optional)DataTableRecord[] | Array of documents provided by Elasticsearch. |
| **sampleSize** | number | The max size of the documents returned by Elasticsearch. |
| **setExpandedDoc** | (optional)(doc?: DataTableRecord) => void; | Function to set the expanded document, which is displayed in a flyout. |
| **settings** | (optional)UnifiedDataTableSettings | Grid display settings persisted in Elasticsearch (e.g. column width). |
| **searchDescription** | (optional)string | Search description. |
| **searchTitle** | (optional)string | Search title. |
| **showTimeCol** | boolean | Determines whether the time columns should be displayed (legacy settings). |
| **showFullScreenButton** | (optional)boolean | Determines whether the full screen button should be displayed. |
| **isSortEnabled** | (optional)boolean | Manage user sorting control. |
| **sort** | SortOrder[] | Current sort setting. |
| **isPaginationEnabled** | (optional)boolean | Manage pagination control. |
| **controlColumnIds** | (optional)string[] | List of used control columns (available: 'openDetails', 'select'). |
| **rowHeightState** | (optional)number | Row height from state. |
| **onUpdateRowHeight** | (optional)(rowHeight: number) => void; | Update row height state. |
| **isPlainRecord** | (optional)boolean | Is text base lang mode enabled. |
| **rowsPerPageState** | (optional)number | Current state value for rowsPerPage. |
| **onUpdateRowsPerPage** | (optional)(rowsPerPage: number) => void; | Update rows per page state. |
| **onFieldEdited** | (optional)() => void; | Callback to execute on edit runtime field. |
| **cellActionsTriggerId** | (optional)string | Optional triggerId to retrieve the column cell actions that will override the default ones. |
| **services** | See Required **services** list below | Service dependencies. |
| **renderDocumentView** | (optional)(hit: DataTableRecord,displayedRows: DataTableRecord[],displayedColumns: string[]) => JSX.Element | undefined; | Callback to render DocumentView when the document is expanded. |
| **configRowHeight** | (optional)number | Optional value for providing configuration setting for UnifiedDataTable rows height. |
| **showMultiFields** | (optional)boolean | Optional value for providing configuration setting for enabling to display the complex fields in the table. Default is true. |
| **maxDocFieldsDisplayed** | (optional)number | Optional value for providing configuration setting for maximum number of document fields to display in the table. Default is 50. |
| **rowAdditionalLeadingControls** | (optional)RowControlColumn[] | Optional value for providing an list of the additional leading control columns. UnifiedDataTable includes two control columns: Open Details and Select. |
| **totalHits** | (optional)number | Number total hits from ES. |
| **onFetchMoreRecords** | (optional)() => void | To fetch more. |
| **externalAdditionalControls** | (optional)React.ReactNode | Optional value for providing the additional controls available in the UnifiedDataTable toolbar to manage it's records or state. UnifiedDataTable includes Columns, Sorting and Bulk Actions. |
| **rowsPerPageOptions** | (optional)number[] | Optional list of number type values to set custom UnifiedDataTable paging options to display the records per page. |
| **renderCustomGridBody** | (optional)(args: EuiDataGridCustomBodyProps) => React.ReactNode; | An optional function called to completely customize and control the rendering of EuiDataGrid's body and cell placement. |
| **visibleCellActions** | (optional)number | An optional value for a custom number of the visible cell actions in the table. By default is up to 3. |
| **externalCustomRenderers** | (optional)Record<string,(props: EuiDataGridCellValueElementProps) => React.ReactNode>; | An optional settings for a specified fields rendering like links. Applied only for the listed fields rendering. |
| **consumer** | (optional)string | Name of the UnifiedDataTable consumer component or application. |
| **componentsTourSteps** | (optional)Record<string,string> | Optional key/value pairs to set guided onboarding steps ids for a data table components included to guided tour. |~~~~
| **onUpdateDataGridDensity** | (optional)(DataGridDensity) => void; | Optional callback when the data grid density configuration is modified. |

*Required **services** list:
```
    theme: ThemeServiceStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
    dataViewFieldEditor: DataViewFieldEditorStart;
    toastNotifications: ToastsStart;
    storage: Storage;
    data: DataPublicPluginStart;
```

Usage example:

```
    // Memoize unified data table to avoid the unnecessary re-renderings
    const DataTableMemoized = React.memo(UnifiedDataTable);

   // Add memoized component with all needed props
    <DataTableMemoized
      ariaLabelledBy="timelineDocumentsAriaLabel"
      className={'unifiedDataTableTimeline'}
      columns={['event.category', 'event.action', 'host.name', 'user.name']}
      expandedDoc={expandedDoc as DataTableRecord}
      enableInTableSearch
      dataView={dataView}
      loadingState={isQueryLoading ? DataLoadingState.loading : DataLoadingState.loaded}
      onFilter={() => {
        // Add logic to refetch the data when the filter by field was added/removed. Refetch data.
      }}
      onResize={(colSettings: { columnId: string; width: number | undefined }) => {
        // Update the table state with the new width for the column
      }}
      onSetColumns={(columns: string[], hideTimeColumn: boolean) => {
        // Update table state with the new columns. Refetch data.
      }}
      onSort={!isTextBasedQuery ? onSort : undefined
        // Update table state with the new sorting settings. Refetch data.
      }
      rows={searchResultRows}
      sampleSize={500}
      setExpandedDoc={() => {
        // Callback function to do the logic when the document is expanded
      }}
      settings={tableSettings}
      showTimeCol={true}
      isSortEnabled={true}
      sort={sortingColumns}
      rowHeightState={3}
      onUpdateRowHeight={(rowHeight: number) => {
        // Do the state update with the new setting of the row height
      }}
      isPlainRecord={isTextBasedQuery}
      rowsPerPageState={50}
      onUpdateRowsPerPage={(rowHeight: number) => {
        // Do the state update with the new number of the rows per page
      }
      onFieldEdited={() => 
        // Callback to execute on edit runtime field. Refetch data.
      }
      cellActionsTriggerId={SecurityCellActionsTrigger.DEFAULT}
      services={{
        theme,
        fieldFormats,
        storage,
        toastNotifications: toastsService,
        uiSettings,
        dataViewFieldEditor,
        data: dataPluginContract,
      }}
      visibleCellActions={3}
      externalCustomRenderers={{
        // Set the record style definition for the specific fields rendering Record<string,(props: EuiDataGridCellValueElementProps) => React.ReactNode>
      }}
      renderDocumentView={() => 
        // Implement similar callback to render the Document flyout
          const renderDetailsPanel = useCallback(
                () => (
                <DetailsPanel
                    browserFields={browserFields}
                    handleOnPanelClosed={handleOnPanelClosed}
                    runtimeMappings={runtimeMappings}
                    tabType={TimelineTabs.query}
                    scopeId={timelineId}
                    isFlyoutView
                />
                ),
                [browserFields, handleOnPanelClosed, runtimeMappings, timelineId]
            );
      }
      externalAdditionalControls={additionalControls}
      renderCustomGridBody={renderCustomGridBody}
      rowsPerPageOptions={[10, 30, 40, 100]}
      showFullScreenButton={false}
      maxDocFieldsDisplayed={50}
      consumer="timeline"
      totalHits={
        // total number of the documents in the search query result. For example: 1200
      }
      onFetchMoreRecords={() => {
        // Do some data fetch to get more data
      }}
      configRowHeight={3}
      showMultiFields={true}
      componentsTourSteps={'expandButton': DISCOVER_TOUR_STEP_ANCHOR_IDS.expandDocument}
    />
```

## JsonCodeEditorCommon Component
Props description:
| Property | Type | Description |
| :---   | :--- | :--- |
| **width** | (optional) string or number  | Editor component width. |
| **height** | (optional) string or number  | Editor component height. |
| **hasLineNumbers** | (optional) boolean  | Define if the editor component has line numbers style. |
| **hideCopyButton** | (optional) boolean  | Show/hide setting for Copy button. |
| **onEditorDidMount** | (editor: monaco.editor.IStandaloneCodeEditor) => void  | Do some logic to update the state with the edotor component value. |

Usage example:

```
<JsonCodeEditorCommon
    jsonValue={jsonValue}
    width={100}
    height={400}
    hasLineNumbers={true}
    onEditorDidMount={(editorNode: monaco.editor.IStandaloneCodeEditor) => setEditor(editorNode)}
/>

```

## Utils

* `getRowsPerPageOptions(currentRowsPerPage)` - gets list of the table defaults for perPage options.

* `getDisplayedColumns(currentRowsPerPage)` - gets list of the table columns with the logic to define the empty list with _source column.

* `popularizeField(...)` - helper function to define the dataView persistance and save indexPattern update capabilities.

## Hooks

* `useColumns(...)` - this hook define the state update for the columns event handlers and allows to use them for external components outside the UnifiedDataTable.

An example of using hooks for defining event handlers for columns management with setting the consumer specific setAppState:

```
const {
    columns: currentColumns,
    onAddColumn,
    onRemoveColumn,
    onMoveColumn,
    onSetColumns,
  } = useColumns({
    capabilities,
    defaultOrder: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    dataView,
    dataViews,
    setAppState: stateContainer.appState.update,
    columns,
    sort,
  });

// Use onAddColumn, onRemoveColumn handlers in the DocumentView

const renderDocumentView = useCallback(
    (hit: DataTableRecord, displayedRows: DataTableRecord[], displayedColumns: string[]) => (
      <DiscoverGridFlyout
        dataView={dataView}
        hit={hit}
        hits={displayedRows}
        // if default columns are used, dont make them part of the URL - the context state handling will take care to restore them
        columns={displayedColumns}
        savedSearchId={savedSearch.id}
        onFilter={onAddFilter}
        onRemoveColumn={onRemoveColumn}
        onAddColumn={onAddColumn}
        onClose={() => setExpandedDoc(undefined)}
        setExpandedDoc={setExpandedDoc}
        query={query}
      />
    ),
    [dataView, onAddColumn, onAddFilter, onRemoveColumn, query, savedSearch.id, setExpandedDoc]
  );
```