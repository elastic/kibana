<!-- To regenerate, run: node scripts/generate workflow-step-docs -->

# Workflow steps

Workflow steps are the building blocks of a workflow. Use the category pages for full reference content.

## Browse by category

- [AI](step-definitions-category-ai.md) (4 steps)
- [Data](step-definitions-category-data.md) (10 steps)
- [kibana.cases](step-definitions-category-kibana_cases.md) (25 steps)

## All steps

- **Aggregate Collection** (`data.aggregate`, Data): Group records and compute metrics like count, sum, avg, min, and max — [Data steps](step-definitions-category-data.md)
- **AI Classify** (`ai.classify`, AI): Categorizes data into predefined categories using AI — [AI steps](step-definitions-category-ai.md)
- **AI Prompt** (`ai.prompt`, AI): Sends a prompt to an AI connector and returns the response — [AI steps](step-definitions-category-ai.md)
- **AI Summarize** (`ai.summarize`, AI): Generates a summary of the provided content using AI — [AI steps](step-definitions-category-ai.md)
- **Cases - Add alerts to case** (`cases.addAlerts`, kibana.cases): Adds one or more alerts as case attachments — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Add comment** (`cases.addComment`, kibana.cases): Adds a user comment to a case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Add events to case** (`cases.addEvents`, kibana.cases): Adds one or more events as case attachments — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Add observables to case** (`cases.addObservables`, kibana.cases): Adds one or more observables to a case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Add tag to case** (`cases.addTags`, kibana.cases): Add tags to an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Assign case** (`cases.assignCase`, kibana.cases): Assigns users to an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Close case** (`cases.closeCase`, kibana.cases): Closes an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Create case** (`cases.createCase`, kibana.cases): Creates a new case with the specified attributes — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Delete cases** (`cases.deleteCases`, kibana.cases): Deletes one or more cases — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Delete observable** (`cases.deleteObservable`, kibana.cases): Removes an observable from a case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Find cases** (`cases.findCases`, kibana.cases): Searches and filters cases — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Find similar cases** (`cases.findSimilarCases`, kibana.cases): Finds cases similar to the specified case ID — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Get all case attachments** (`cases.getAllAttachments`, kibana.cases): Retrieves all attachments for a case in a single call — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Get case by ID** (`cases.getCase`, kibana.cases): Retrieves a case using its unique identifier — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Get cases** (`cases.getCases`, kibana.cases): Batch-retrieves multiple cases by their IDs in a single call — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Get cases by alert ID** (`cases.getCasesByAlertId`, kibana.cases): Retrieves all cases that contain a specific alert — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Set case description** (`cases.setDescription`, kibana.cases): Sets description for an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Set case severity** (`cases.setSeverity`, kibana.cases): Sets severity for an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Set case status** (`cases.setStatus`, kibana.cases): Sets status for an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Set case title** (`cases.setTitle`, kibana.cases): Sets title for an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Set category on a case** (`cases.setCategory`, kibana.cases): Sets the category for an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Unassign case** (`cases.unassignCase`, kibana.cases): Removes assignees from an existing case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Update case** (`cases.updateCase`, kibana.cases): Updates a case with the specified fields — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Update cases** (`cases.updateCases`, kibana.cases): Updates multiple cases in one step — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Cases - Update observable** (`cases.updateObservable`, kibana.cases): Updates the value and description of an existing observable on a case — [kibana.cases steps](step-definitions-category-kibana_cases.md)
- **Concat Arrays** (`data.concat`, Data): Combine multiple arrays into a single array — [Data steps](step-definitions-category-data.md)
- **Deduplicate Collection** (`data.dedupe`, Data): Remove duplicate items from a collection based on unique keys — [Data steps](step-definitions-category-data.md)
- **Extract with Regex** (`data.regexExtract`, Data): Extract fields from text using regular expression capture groups — [Data steps](step-definitions-category-data.md)
- **Filter Collection** (`data.filter`, Data): Filter arrays using KQL conditions to return only matching items — [Data steps](step-definitions-category-data.md)
- **Find First Match** (`data.find`, Data): Find the first item in an array matching a KQL condition — [Data steps](step-definitions-category-data.md)
- **Map Collection** (`data.map`, Data): Transform arrays or single objects by renaming fields, removing keys, or computing new values — [Data steps](step-definitions-category-data.md)
- **Parse JSON** (`data.parseJson`, Data): Parse a JSON string into a structured object or array — [Data steps](step-definitions-category-data.md)
- **Replace with Regex** (`data.regexReplace`, Data): Replace text patterns using regular expressions — [Data steps](step-definitions-category-data.md)
- **Run Agent** (`ai.agent`, AI): Execute an AgentBuilder AI agent to process input and generate responses. Optionally provide a JSON schema to receive structured output. — [AI steps](step-definitions-category-ai.md)
- **Stringify JSON** (`data.stringifyJson`, Data): Convert a structured object or array to a JSON string — [Data steps](step-definitions-category-data.md)
