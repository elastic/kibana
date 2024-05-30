# @kbn/json-tree

JSON viewer in a tree format used in Discover Document view ES|QL mode. 

To use it:

```
<JSONTree
  data={data}
  isDarkMode={isDarkMode}
  isSingleRow={isSingleRow}
  onTreeExpand={onTreeExpand}
/>
```

where: 

- data is the JSON data
- isDarkMode  a flag which indicates if the viewer is rendered in the dark or light mode (slightly changes the colors used for the fields)
- isSingleRow, a flag which indicates if the JSON is rendered in a single row; at this mode the tree is not expanded
- onTreeExpand, callback to call when the user is toggling the expand button
