define(function () {
  return function (leaf) {
    // walk up the branch for each parent
    function walk(item, memo) {
      // record the the depth
      let depth = item.depth - 1;

      // Using the aggConfig determine what the field name is. If the aggConfig
      // doesn't exist (which means it's an _all agg) then use the level for
      // the field name
      let col = item.aggConfig;
      let field = (col && col.params && col.params.field && col.params.field.displayName)
        || (col && col.label)
        || ('level ' + item.depth);

      // Add the row to the tooltipScope.rows
      memo.unshift({
        aggConfig: col,
        depth: depth,
        field: field,
        bucket: item.name,
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
