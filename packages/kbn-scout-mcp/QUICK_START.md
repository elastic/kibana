# Scout MCP - Quick Start Guide

Get started with Scout MCP in Cursor in 3 minutes.

## Step 1: Configure Cursor (2 minutes)

1. **Edit Cursor MCP config** (on macOS):
   ```bash
   open ~/Library/Application\ Support/Cursor/User/globalStorage/mcp.json
   ```

2. **Add this configuration**:
   ```json
   {
     "mcpServers": {
       "scout": {
         "command": "bash",
         "args": [
           "-c",
           "cd /Users/enrique/workspace/kibana && npx tsx packages/kbn-scout-mcp/bin/cli.ts --target http://localhost:5601"
         ]
       }
     }
   }
   ```

3. **Important**: Replace `/Users/enrique/workspace/kibana` with YOUR actual Kibana path (it appears in the cd command)

4. **Restart Cursor**: Quit completely (Cmd+Q) and restart

## Step 2: Start Kibana (1 minute)

Make sure Kibana is running:
```bash
cd /Users/enrique/workspace/kibana
yarn start
```

Wait for: `http://localhost:5601`

## Step 3: Test It (1 minute)

In Cursor chat, type:
```
Navigate to the Discover app and take a screenshot
```

If you see a screenshot, it's working! 🎉

## What Can You Do Now?

### Run Test Cases
```
Use Scout to test this scenario:
1. Navigate to Dashboard
2. Create a new dashboard
3. Add some panels
4. Save it as "My Test Dashboard"
5. Take a screenshot
```

### Debug Failing Tests
```
My test is failing at step 3. Use Scout to:
1. Run steps 1 and 2
2. Take a screenshot
3. Show me what's on the page
4. Try step 3 and see what happens
```

### Explore Kibana
```
Navigate to Discover, show me what page objects are available, and help me write a test
```

## Need Help?

- **Setup issues**: See README.md
- **Usage examples**: See USAGE.md
- **Debugging tests**: See DEBUGGING.md
- **Quick commands**: See DEBUG_QUICK_REF.md

## Common Issues

**"No server info found"**
- Check the Kibana path in the `cd` command in your config
- Make sure it points to your Kibana directory

**"Cannot find module" or "ERR_MODULE_NOT_FOUND"**
- Verify the path in the `cd` command is correct
- Run: `cd /Users/enrique/workspace/kibana && yarn kbn bootstrap`
- Make sure you're using the `bash -c` format with the explicit `cd` command

**Kibana not responding**
- Make sure Kibana is running: http://localhost:5601
- Check the `--target` URL in your config

That's it! You're ready to use Scout MCP for testing in Cursor. 🚀
