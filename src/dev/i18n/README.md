## Locale files verification / integration tool

### Description

The tool is used for verifying locale file, finding unused / missing messages, key duplications, grouping messages by namespaces and creating JSON files in right folders.

### Notes

The tool throws an exception if formats object is missing in locale file.

### Usage

```bash
node scripts/i18n_integrate --path path/to/locale.json
```

### Output

The tool generates locale files in plugins folders after splitting them by namespaces.\
The tool outputs paths of created files to the console, so the person who performs locale file integration should just register listed translation files.
