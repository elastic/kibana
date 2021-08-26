# kbn-securitysolution-io-ts-utils

Very small set of utilities for io-ts which we use across plugins within security solutions such as securitysolution, lists, cases, etc...
This folder should remain small and concise since it is pulled into front end and the more files we add the more weight will be added to all
of the plugins. Also, any new dependencies added to this will add weight here and the other plugins, so be careful of what is added here.

You might consider making another package instead and putting a dependency on this one if needed, instead.

Related packages are
* kbn-securitysolution-io-ts-alerting-types
* kbn-securitysolution-io-ts-list-types
* kbn-securitysolution-io-ts-types