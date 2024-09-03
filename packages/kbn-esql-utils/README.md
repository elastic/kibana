# @kbn/esql-utils

This package contains utilities for ES|QL.

- *getESQLAdHocDataview*: Use this function to get correctly an adHoc dataview for your query. 
- *getIndexPatternFromESQLQuery*: Use this to retrieve the index pattern from the `from` command.
- *getLimitFromESQLQuery*: Use this function to get the limit for a given query. The limit can be either set from the `limit` command or can be a default value set in ES.
- *removeDropCommandsFromESQLQuery*: Use this function to remove all the occurences of the `drop` command from the query.
- *appendToESQLQuery*: Use this function to append more pipes in an existing ES|QL query. It adds the additional commands in a new line. 
- *appendWhereClauseToESQLQuery*: Use this function to append where clause in an existing query. 
- *retieveMetadataColumns*: Use this function to get if there is a metadata option in the from command, and retrieve the columns if so
