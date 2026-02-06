# @kbn/security-solution-common

## Purpose

This package hosts all the security solution code that we need to use in the Security Solution plugin as well as the
Discover plugin. While the `kbn-security-solution-flyout` package hosts all the flyout specific code, this
`kbn-security-solution-common` package contains the code that will be used both by that package and by other pages in
Security Solution. That way, we avoid code duplication and make sure that both plugins use the same code.

This package is intended to grow pretty quickly, as we're moving components in the `kbn-security-solution-flyout`
package. We might consider splitting it into multiple smaller packages if the need arises.

## Thoughts when contributing to this package

As this code is meant to be used in the Security Solution and Discover plugins, please make sure that they are:

- well documented
- well unit tested
