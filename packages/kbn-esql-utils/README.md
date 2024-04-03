# @kbn/esql-utils

This package contains utilities for ES|QL.

- *getESQLAdHocDataview*: Use this function to get correctly an adHoc dataview for your query. 
- *getIndexPatternFromESQLQuery*: Use this to retrieve the index pattern from the `from` command.
- *getLimitFromESQLQuery*: Use this function to get the limit for a given query. The limit can be either set from the `limit` command or can be a default value set in ES.
- *removeDropCommandsFromESQLQuery*: Use this function to remove all the occurences of the `drop` command from the query.

