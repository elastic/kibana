# @kbn/esql-registry

ES|QL registry to define specific elements of the ES|QL editor such as:

- Recommended queries


## Example Usage
Add dependency on the esqlRegistry plugin.

// Setting extensions
esqlRegistry.setExtension("logs*", { recommendedQueries: [ {name: "Sort by timestamp", query: "FROM logs* | SORT @timestamp"}, { name: "Breakdown by log level", "query": "FROM logs* | STATS COUNT(*) BY log.level" }] });
esqlRegistry.setExtension("metrics*", { recommendedQueries: [{ name: "Aggregate metrics", query: "FROM metrics* | STATS CONUNT(*)" }] });

// Getting extensions
console.log(esqlRegistry.getExtension("logs*")); // { recommendedQueries: [ {name: "Sort by timestamp", query: "FROM logs* | SORT @timestamp"}, { name: "Breakdown by log level", "query": "FROM logs* | STATS COUNT(*) BY log.level" }] }

// Deleting extensions
esqlRegistry.deleteExtension("metrics*");

console.log(esqlRegistry.getAllExtensions()); // Show all current extensions