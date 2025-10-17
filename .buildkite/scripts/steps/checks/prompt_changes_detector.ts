/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { upsertComment } from '#pipeline-utils';

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
    console.log('Posting prompt changes reminder comment...');

    await upsertComment({
      commentBody: COMMENT_MESSAGE,
      commentContext: 'prompt-changes-reminder',
      clearPrevious: true,
    });

    console.log('✅ Reminder comment posted successfully');
  } catch (error) {
    console.error('❌ Error posting prompt changes comment:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
