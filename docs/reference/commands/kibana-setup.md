---
navigation_title: kibana-setup
applies_to:
  deployment:
    self: ga
products:
  - id: kibana
---

# kibana-setup [kibana-setup]

The `kibana-setup` tool walks you through all required steps to securely connect {{kib}} with {{es}}.


## Synopsis [_synopsis]

```shell
bin/kibana-setup
[-t, --enrollment-token <token>] [-s, --silent]
[-V, --version] [-h, --help]
```


## Description [_description]

Use this command to configure a secure connection between {{kib}} and {{es}}. The tool guides you through the process of enrolling {{kib}} with a secured {{es}} cluster using an enrollment token. This is particularly useful for initial setup and configuration of {{kib}} in secured environments.

::::{important}
You must have an enrollment token generated from your {{es}} cluster before running this command.
::::



## Parameters [kibana-setup-parameters]

`-t, --enrollment-token <token>`
:   Elasticsearch enrollment token to use for configuring the connection.

`-s, --silent`
:   Prevent all logging output during the setup process.

`-h, --help`
:   Returns all of the command parameters.

`-V, --version`
:   Displays the {{kib}} version number.


## Examples [_examples_2]

The following command runs the interactive setup process:

```shell
bin/kibana-setup
```

The following command configures {{kib}} with a specific enrollment token:

```shell
bin/kibana-setup --enrollment-token <your-enrollment-token>
```

The following command runs setup silently with an enrollment token:

```shell
bin/kibana-setup --enrollment-token <your-enrollment-token> --silent
```
