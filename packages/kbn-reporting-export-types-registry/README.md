## Summary

There are three constructs that interact: the `ReportingPlugin`, the `ExportTypesPlugin` and the `ExportTypesRegistry`.

`ReportingExportTypesPlugin` on setup() creates the  `export_type_definitions`. The export type definitions can be one of the following:
- CSVExportTypeDefinition
- PNGExportTypeDefinition
- PDFExportTypeDefinition

The `ReportingPlugin`  calls the `ReportingExportTypesPlugin` and creates an instance of the `ExportTypeRegistry`. These export types use the `ReportingPlugin`'s registerExportType() within the `ExportTypeRegistry`. The `ReportingPlugin` uses the getExportType() method to use the registered export types for exporting.