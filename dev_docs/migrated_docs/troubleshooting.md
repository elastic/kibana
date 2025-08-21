---
id: kibTroubleshooting
slug: /kibana-dev-docs/getting-started/troubleshooting
title: Troubleshooting
description: A collection of tips for working around strange issues.
date: 2025-08-21
tags: ['kibana', 'onboarding', 'dev', 'troubleshooting']
---

Common development issues and their solutions for Kibana contributors.

## TypeScript Issues

### Cache Corruption After Branch Switching

**Symptoms:**
- Invalid TypeScript errors that shouldn't exist
- Slow type checking or builds that hang
- "Cannot find module" errors for existing files

**Solutions:**

**Option 1: Clean TypeScript Cache**
```bash
node scripts/type_check.js --clean-cache
```

**Option 2: Nuclear Reset (Nuclear Option)**
```bash
# Preview what will be deleted (dry run)
git clean -fdxn -e /config -e /.vscode

# Review the output carefully, add more excludes (-e) if needed
# Then execute without -n flag to actually delete
git clean -fdx -e /config -e /.vscode

# Reinstall dependencies
yarn kbn bootstrap
```

> [!WARNING]
> The `git clean` command will delete all untracked files. Review the dry-run output carefully and add excludes for any important files you want to keep.

**Prevention Tips:**
- Run `yarn kbn bootstrap` after switching to branches with dependency changes
- Use `yarn kbn clean` before switching to significantly different branches
- Keep your workspace clean by regularly committing or stashing changes

## Cross-Cluster Search (CCS) Compatibility

### search.check_ccs_compatibility Error

**Error Example:**
```
[class org.elasticsearch.action.search.SearchRequest] is not compatible 
version 8.1.0 and the 'search.check_ccs_compatibility' setting is enabled.
```

**Root Cause:**
Your code uses Elasticsearch features that don't exist in older versions, breaking Cross-Cluster Search compatibility.

**Solutions:**

**For Experimental Features:**
1. Move failing tests to a special test suite that disables CCS compatibility checking
2. Add clear documentation about the CCS limitation
3. **Critical:** Remember to move tests back to the default suite when the feature reaches GA

**For Production Features:**
1. Use feature detection or version checks before using new Elasticsearch APIs
2. Provide fallback behavior for older cluster versions
3. Consult with the Kibana Operations team for guidance

**Example Fix:**
```typescript
// ❌ Bad - uses new feature without compatibility check
const searchRequest = {
  // New field that doesn't exist in older ES versions
  fields: ['field1', 'field2'] 
};

// ✅ Good - check capability first
const searchRequest = esClient.capabilities.supportsFields 
  ? { fields: ['field1', 'field2'] }
  : { _source: ['field1', 'field2'] }; // Fallback for older versions
```

**Why This Matters:**
- CCS is not a corner case - many users rely on it
- Kibana must work consistently across different cluster configurations
- Breaking CCS affects enterprise deployments significantly

**Need Help?**
Contact the [Kibana Operations team](https://github.com/orgs/elastic/teams/kibana-operations) for CCS-related questions.

## React Development Issues

### Minified React Error Messages

**Problem:**
React errors appear as cryptic codes like "Minified React error #31" instead of helpful messages.

**Solution:**
Switch the shared dependencies to development mode:

1. **Edit webpack config:**
   ```diff
   # In packages/kbn-ui-shared-deps-npm/webpack.config.js
   -    mode: 'production',
   +    mode: 'development',
   ```

2. **Rebuild dependencies:**
   ```bash
   yarn kbn bootstrap
   ```

3. **Restart Kibana development server**

**When to Use:**
- Debugging React component issues
- Investigating React hooks problems
- Analyzing component lifecycle errors

> [!NOTE]
> Remember to revert this change before committing, as it affects bundle size and performance.

## Performance and Memory Issues

### Out of Memory Errors

**Node.js heap limit exceeded:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
yarn start
```

**TypeScript memory issues:**
```bash
# Use TypeScript with more memory
node --max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit
```

### Slow Build Times

**Check disk space:**
```bash
df -h  # Linux/macOS
# Ensure you have at least 10GB free space
```

**Clear all caches:**
```bash
yarn kbn clean
rm -rf node_modules
yarn kbn bootstrap
```

**Optimize for development:**
```bash
# Use faster transpilation (development only)
yarn start --dev --no-optimizer
```

## Testing Issues

### Jest Tests Failing Randomly

**Clear Jest cache:**
```bash
yarn jest --clearCache
```

**Reset test environment:**
```bash
yarn kbn clean
yarn kbn bootstrap
yarn test:jest
```

### Functional Tests Not Working

**Check Elasticsearch and Kibana startup:**
```bash
# In separate terminals
yarn es snapshot  # Start Elasticsearch
yarn start        # Start Kibana

# Then run functional tests
yarn test:ftr
```

**Common port conflicts:**
```bash
# Check what's using Kibana's default port
lsof -i :5601

# Kill the process if needed
kill -9 <PID>
```

## IDE and Editor Issues

### VS Code TypeScript Problems

**Restart TypeScript service:**
- `Cmd/Ctrl + Shift + P`
- Type "TypeScript: Restart TS Server"
- Press Enter

**Reload window:**
- `Cmd/Ctrl + Shift + P`
- Type "Developer: Reload Window"
- Press Enter

### IntelliJ/WebStorm Issues

**Invalidate caches:**
- File → Invalidate Caches and Restart
- Select "Invalidate and Restart"

## Network and Proxy Issues

### Corporate Proxy Problems

**Configure yarn for proxy:**
```bash
yarn config set https-proxy http://proxy.company.com:8080
yarn config set http-proxy http://proxy.company.com:8080
```

**Bypass proxy for local development:**
```bash
export NO_PROXY="localhost,127.0.0.1,.local"
```

### SSL Certificate Issues

**Disable SSL verification (development only):**
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
yarn start
```

> [!WARNING]
> Only use this in development environments. Never disable SSL verification in production.

## General Debugging Tips

### Enable Debug Logging

**Kibana server debug logs:**
```bash
yarn start --verbose
```

**Specific logger debugging:**
```yaml
# In config/kibana.dev.yml
logging:
  loggers:
    - name: plugins.myPlugin
      level: debug
```

### Browser Developer Tools

**React Developer Tools:**
- Install React DevTools browser extension
- Use Components and Profiler tabs for debugging

**Performance debugging:**
- Use browser Performance tab
- Record interactions to identify bottlenecks
- Check for memory leaks in Memory tab

### Getting Help

**Before asking for help:**
1. Search existing GitHub issues
2. Check the troubleshooting docs (this page)
3. Try the nuclear reset option
4. Clear all caches

**Where to get help:**
- [Kibana Discussions](https://github.com/elastic/kibana/discussions)
- [Elastic Community Slack](https://elasticstack.slack.com)
- [Kibana Operations team](https://github.com/orgs/elastic/teams/kibana-operations) for infrastructure issues

**When reporting issues:**
- Include your Node.js version (`node --version`)
- Include your yarn version (`yarn --version`)
- Include your operating system
- Provide complete error messages and stack traces
- Mention what you were doing when the issue occurred