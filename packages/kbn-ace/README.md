# @kbn/ace

Contains all Kibana-specific brace related code. Excluding the code that still inside of Console because that code is only used inside of console at the moment.

This package enables plugins to use this functionality and import it as needed -- behind an async import so that brace does not bloat the JS code needed for first page load of Kibana.
