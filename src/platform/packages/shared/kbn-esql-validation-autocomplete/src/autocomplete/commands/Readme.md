## Command Autocomplete

Each command incorporates its own suggestion logic, defined by its **`suggest`** function. Additionally, some commands define a **`fieldsSuggestionsAfter`** function.

### `fieldsSuggestionsAfter`

This method is optional. When it's not provided, the default suggestion logic, detailed in **`getCurrentQueryAvailableFields`** within `src/platform/packages/shared/kbn-esql-validation-autocomplete/src/shared/helpers.ts`, will be applied.

The primary purpose of **`fieldsSuggestionsAfter`** is to **specify the columns that become available for suggestion after a command has been executed**. For instance, following a `DROP` command, the autocomplete will suggest index fields and user-defined fields, excluding the fields specified in the `DROP` command itself.

Each implementation of this method is thoroughly tested.

#### Advantages

  * Eliminates the need for an additional request to Elasticsearch (ES) each time field suggestions are required in the autocomplete.

#### Disadvantages

  * Requires careful implementation of this logic whenever a new command is introduced. However, this is generally a straightforward task.