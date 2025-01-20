# Files

The files service provides functionality to manage, retrieve, share files in Kibana.

## Overview

The file service provides the following capabilities to plugins to create,
manage and share file contents:

* Auto-register HTTP APIs for your file
  * These HTTP APIs can also be access controlled
* A server-side client
* A browser-side client
* Various reusable UI components that can provide a consistent user experience
* Publicly sharing files (i.e., bypassing all security)
* Leveraging file caching where possible

## Getting started

See [the tutorial](https://docs.elastic.dev/kibana-dev-docs/file-service).

## API reference

See the [reference](https://docs.elastic.dev/kibana-dev-docs/api/files).

## Public components

> To see any component in action run `yarn storybook files` and follow the prompts

The files service offers a number of UI components that are reusable UIs to provide
a consistent UX for managing files while keeping integration with the file service
light for consumers.

* `<Image />` - A specialized component for efficiently downloading and rendering files in the UI that wraps an `img` tag.
* `<UploadFile />` - The `EuiFilePicker` wrapped with robust upload logic for one or multiple files
* `<FilePicker />` - A way for users to view and select from one or more uploaded files

in the terminal.

---
## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
