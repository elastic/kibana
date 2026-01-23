Markdown

---

# ESQL Command Registry

This registry provides a centralized system for managing and interacting with ES|QL (Elastic Security Query Language) commands. It allows for the registration, retrieval, and execution of command-specific functionalities such as validation, autocompletion, and column resolution.

---

## Features

The ESQL Command Registry offers the following key features:

* **Command Registration**: Easily register new ES|QL commands with their associated methods and metadata.
* **Method Retrieval**: Retrieve specific methods (e.g., `validate`, `autocomplete`, `columnsAfter`) for any registered command.
* **Command Discovery**: Get a list of all registered command names or retrieve full command objects by name.

---

## Core Concepts

### `ICommandMethods<TContext>`

This interface defines the essential methods that each ES|QL command should implement. These methods are crucial for the command's behavior within the query pipeline and provide deep integration capabilities.

| Method | Description |
| :----- | :---------- |
| `validate?` | (Optional) Validates a given query string or Abstract Syntax Tree (AST) snippet specific to the command, returning an array of messages (errors/warnings). |
| `autocomplete` | Provides suggestions for autocompletion based on the current query context and the command's syntax. |
| `columnsAfter?` | (Optional) Determines the columns available or expected after this command, vital for chaining commands and ensuring type compatibility. |

### `ICommandMetadata`

This interface describes the metadata associated with each registered command. This information can be used for UI display, documentation, and other purposes.

| Property | Type | Description |
| :------- | :--- | :---------- |
| `preview?` | `boolean` | Indicates if the command is in preview mode. |
| `description` | `string` | A brief description of the command. |
| `declaration` | `string` | The pattern for declaring this command statement, often displayed in autocompletion. |
| `examples` | `string[]` | A list of examples demonstrating how to use the command. |
| `hidden?` | `boolean` | Indicates if the command should be hidden in UI. |
| `types?` | `Array<{ name: string; description: string }>` | Command-specific types with descriptions. |

### `ICommand`

This interface represents a single registered command, combining its name, methods, and metadata.

| Property | Type | Description |
| :------- | :--- | :---------- |
| `name` | `string` | The unique name of the command. |
| `methods` | `ICommandMethods` | The object containing the command's functional methods. |
| `metadata` | `ICommandMetadata` | The metadata associated with the command. |

### `ICommandRegistry`

This interface defines the public API for the ESQL Command Registry.

| Method | Description |
| :----- | :---------- |
| `registerCommand(command: ICommand)` | Registers a new command with its associated methods and metadata. |
| `getCommandMethods(commandName: string)` | Retrieves the `ICommandMethods` object for a given command name. |
| `getAllCommandNames()` | Returns an array of names for all registered commands. |
| `getCommandByName(commandName: string)` | Retrieves the full `ICommand` object by its name. |

---

## Usage

### `CommandRegistry` Class

The `CommandRegistry` class is the concrete implementation of `ICommandRegistry`.

```typescript
import { CommandRegistry, ICommand, ICommandMethods, ICommandMetadata } from './path/to/command_registry';

const registry = new CommandRegistry();

// Define a simple command
const myCommandMethods: ICommandMethods = {
  autocomplete: async (query, command, callbacks, context) => {
    // Implement autocompletion logic
    return [{ text: 'my_suggestion', type: 'field' }];
  },
  validate: (command, ast, context) => {
    // Implement validation logic
    return [];
  },
  columnsAfter: (command, previousColumns, context) => {
    // Implement column resolution logic
    return previousColumns;
  },
};

const myCommandMetadata: ICommandMetadata = {
  description: 'A custom command for demonstration.',
  declaration: 'MY_COMMAND <arg1> [arg2]',
  examples: ['MY_COMMAND value', 'MY_COMMAND other_value optional_arg'],
};

const myCommand: ICommand = {
  name: 'MY_COMMAND',
  methods: myCommandMethods,
  metadata: myCommandMetadata,
};

// Register the command
registry.registerCommand(myCommand);

// Get command methods
const methods = registry.getCommandMethods('MY_COMMAND');
if (methods) {
  console.log('Autocomplete method:', methods.autocomplete);
}

// Get all command names
const allNames = registry.getAllCommandNames();
console.log('All registered commands:', allNames); // Output: ['MY_COMMAND']

// Get a command by name
const retrievedCommand = registry.getCommandByName('MY_COMMAND');
if (retrievedCommand) {
  console.log('Retrieved Command:', retrievedCommand.name);
  console.log('Command Description:', retrievedCommand.metadata.description);
}
```