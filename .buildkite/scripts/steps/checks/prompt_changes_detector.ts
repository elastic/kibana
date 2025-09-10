/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { doAnyChangesMatch, upsertComment } from '#pipeline-utils';

const PROMPT_FILES = [
  /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/local_prompt_object\.ts$/,
  /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/tool_prompts\.ts$/,
  /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/defend_insight_prompts\.ts$/,
  /^x-pack\/solutions\/security\/plugins\/elastic_assistant\/server\/lib\/prompt\/prompts\.ts$/,
];

const COMMENT_MESSAGE = `## 🤖 Prompt Changes Detected

Changes have been detected to one or more prompt files in the Elastic Assistant plugin. 

**Please remember to update the integrations repository** with your prompt changes to ensure consistency across all deployments.

### Next Steps:
1. Follow the documentation in [x-pack/solutions/security/packages/security-ai-prompts/README.md](https://github.com/elastic/kibana/blob/main/x-pack/solutions/security/packages/security-ai-prompts/README.md) to update the corresponding prompt files
2. Make the changes in the [integrations repository](https://github.com/elastic/integrations)
3. Test your changes in the integrations environment
4. Ensure prompt consistency across all deployments

This is an automated reminder to help maintain prompt consistency across repositories.`;

export async function main() {
  try {
    console.log('Checking for changes to prompt files...');

    const hasPromptChanges = await doAnyChangesMatch(PROMPT_FILES);

    if (hasPromptChanges) {
      console.log('Prompt file changes detected. Posting reminder comment...');

      await upsertComment({
        commentBody: COMMENT_MESSAGE,
        commentContext: 'prompt-changes-reminder',
        clearPrevious: true,
      });

      console.log('✅ Reminder comment posted successfully');
    } else {
      console.log('No prompt file changes detected. Skipping comment.');
    }
  } catch (error) {
    console.error('❌ Error checking for prompt changes:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
