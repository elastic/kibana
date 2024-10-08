### ESLint Fixes for Access Tag Migration

This PR migrates \`access:<privilege>\` tags used in route definitions.

### **Before Migration:**
Access control tags were defined in the \`options\` object of the route, using the \`access:<privilege>\` pattern:

\`\`\`ts
router.get({
  path: '/api/path',
  options: {
    tags: ['access:<privilege_1>', 'access:<privilege_2>'],
  },
  ...
}, handler);
\`\`\`

### **After Migration:**
After the migration, these tags have been replaced with the more robust \`security.authz.requiredPrivileges\` field under \`security\`:

\`\`\`ts
router.get({
  path: '/api/path',
  security: {
    authz: {
      requiredPrivileges: ['<privilege_1>', '<privilege_2>'],
    },
  },
  ...
}, handler);
\`\`\`

For more info, please refer to the [Kibana API Authorization Guide]().