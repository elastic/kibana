---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/kibana-verification-code.html
---

# kibana-verification-code [kibana-verification-code]

The `kibana-verification-code` tool retrieves a verification code for enrolling a {{kib}} instance with a secured {{es}} cluster.


## Synopsis [_synopsis]

```shell
bin/kibana-verification-code
[-V, --version] [-h, --help]
```


## Description [_description]

Use this command to retrieve a verification code for {{kib}}. You enter this code in {{kib}} when manually configuring a secure connection with an {{es}} cluster. This tool is useful if you don’t have access to the {{kib}} terminal output, such as on a hosted environment. You can connect to a machine where {{kib}} is running (such as using SSH) and retrieve a verification code that you enter in {{kib}}.

::::{important}
You must run this tool on the same machine where {{kib}} is running.
::::



## Parameters [kibana-verification-code-parameters]

`-h, --help`
:   Returns all of the command parameters.

`-V, --version`
:   Displays the {{kib}} version number.


## Examples [_examples_2]

The following command retrieves a verification code for {{kib}}.

```shell
bin/kibana-verification-code
```

