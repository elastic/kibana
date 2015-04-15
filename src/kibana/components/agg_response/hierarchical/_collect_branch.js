define(function (require) {
  var _ = require('lodash');
  return function (leaf) {
    // walk up the branch for each parent
    function walk(item, memo) {
      // record the the depth
      var depth = item.depth - 1;

      // Using the aggConfig determine what the field name is. If the aggConfig
      // doesn't exist (which means it's an _all agg) then use the level for
      // the field name
      var col = item.aggConfig;
      var field = (col && col.params && col.params.field && col.params.field.displayName)
        || (col && col.label)
        || ('level ' + item.depth);

      // Set the bucket name, and use the converter to format the field if
      // the field exists.
      var bucket = item.name;
      if (col) {
        bucket = col.fieldFormatter()(bucket);
      }

      // Add the row to the tooltipScope.rows
      memo.unshift({
        aggConfig: col,
        depth: depth,
        field: field,
        bucket: bucket,
        metric: item.size,
        item: item
      });

      // If the item has a parent and it's also a child then continue walking
      // up the branch
      if (item.parent && item.parent.parent) {
        return walk(item.parent, memo);
      } else {
        return memo;
      }
    }

    return walk(leaf, []);
  };
});
