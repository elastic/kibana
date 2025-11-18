/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Page Object Architecture Patterns from security-scout-tests branch
 *
 * Demonstrates the sophisticated multi-class page object pattern.
 */

export const PAGE_OBJECT_PATTERNS = `
# Page Object Architecture Patterns

## Multi-Class Page Object Pattern

The security-scout-tests branch uses a sophisticated architecture with:
1. Main orchestrator class
2. Specialized action classes for different domains
3. Separate locators class
4. Dedicated assertions class

### Example: AssistantPage Architecture

\`\`\`typescript
import type { ScoutPage } from '@kbn/scout';
import { AssistantLocators } from './assistant_locators';
import { ConversationActions } from './conversation_actions';
import { MessagingActions } from './messaging_actions';
import { PromptActions } from './prompt_actions';
import { ConnectorActions } from './connector_actions';
import { AssistantAssertions } from './assistant_assertions';

/**
 * Page Object for the AI Assistant flyout
 *
 * Orchestrates specialized action classes for different feature domains.
 *
 * @example
 * \`\`\`typescript
 * await assistantPage.open();
 * await assistantPage.conversations.createNewChat();
 * await assistantPage.messaging.typeAndSendMessage('hello');
 * await assistantPage.assertions.expectMessageSent('hello');
 * \`\`\`
 */
export class AssistantPage {
  public readonly locators: AssistantLocators;
  public readonly conversations: ConversationActions;
  public readonly messaging: MessagingActions;
  public readonly prompts: PromptActions;
  public readonly connectors: ConnectorActions;
  public readonly assertions: AssistantAssertions;

  constructor(private readonly page: ScoutPage) {
    // Initialize locators (shared by all action classes)
    this.locators = new AssistantLocators(page);

    // Initialize messaging first (needed by conversations and prompts)
    this.messaging = new MessagingActions(this.locators);

    // Initialize action classes with dependencies
    this.conversations = new ConversationActions(page, this.locators, this.messaging);
    this.prompts = new PromptActions(page, this.locators, this.messaging);
    this.connectors = new ConnectorActions(page, this.locators);
    this.assertions = new AssistantAssertions(page, this.locators);
  }

  // ========================================
  // High-Level Navigation
  // ========================================

  /**
   * Opens the AI Assistant from the main navigation button
   */
  async open() {
    await this.locators.assistantButton.click();
    await this.waitForAssistantLoaded();
  }

  /**
   * Opens the AI Assistant from a rule context
   */
  async openFromRule() {
    await this.dismissOnboardingTour();
    await this.locators.chatIcon.waitFor({ state: 'visible' });
    // Use force click to bypass toasts that may block the button
    // eslint-disable-next-line playwright/no-force-option
    await this.locators.chatIcon.click({ force: true });
    await this.waitForAssistantLoaded();
  }

  /**
   * Dismisses the onboarding tour if present
   */
  async dismissOnboardingTour() {
    await this.page
      .getByRole('button', { name: 'Close tour' })
      .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
      .catch(() => {
        // Modal not present, continue silently
      });
  }
}
\`\`\`

### Locators Class Pattern

Separate class for all element locators:

\`\`\`typescript
import type { ScoutPage, Locator } from '@kbn/scout';

export class AssistantLocators {
  // Main UI elements
  public assistantButton: Locator;
  public assistantFlyout: Locator;
  public closeFlyoutButton: Locator;

  // Conversation elements
  public conversationSelector: Locator;
  public newChatButton: Locator;
  public conversationTitle: Locator;

  // Messaging elements
  public userPromptTextarea: Locator;
  public sendMessageButton: Locator;
  public messageList: Locator;

  // Connector elements
  public connectorSelector: Locator;
  public connectorMissingCallout: Locator;

  constructor(private readonly page: ScoutPage) {
    this.assistantButton = this.page.testSubj.locator('assistantButton');
    this.assistantFlyout = this.page.testSubj.locator('assistantFlyout');
    this.closeFlyoutButton = this.page.testSubj.locator('euiFlyoutCloseButton');

    this.conversationSelector = this.page.testSubj.locator('conversationSelector');
    this.newChatButton = this.page.testSubj.locator('newChatButton');
    this.conversationTitle = this.page.testSubj.locator('conversationTitle');

    this.userPromptTextarea = this.page.testSubj.locator('userPromptTextarea');
    this.sendMessageButton = this.page.testSubj.locator('sendMessageButton');
    this.messageList = this.page.testSubj.locator('messageList');

    this.connectorSelector = this.page.testSubj.locator('connectorSelector');
    this.connectorMissingCallout = this.page.testSubj.locator('connectorMissingCallout');
  }
}
\`\`\`

### Action Class Pattern

Specialized class for a specific domain:

\`\`\`typescript
import { AssistantLocators } from './assistant_locators';

/**
 * Actions related to messaging
 * (typing, sending messages, timeline integration)
 */
export class MessagingActions {
  constructor(private readonly locators: AssistantLocators) {}

  /**
   * Types text into the prompt textarea
   */
  async typeMessage(text: string) {
    await this.locators.userPromptTextarea.fill(text);
  }

  /**
   * Clicks the send button
   */
  async sendMessage() {
    await this.locators.sendMessageButton.click();
  }

  /**
   * Types and sends a message in one action
   */
  async typeAndSendMessage(text: string) {
    await this.typeMessage(text);
    await this.sendMessage();
  }

  /**
   * Submits current message (for empty submissions)
   */
  async submitMessage() {
    await this.locators.sendMessageButton.click();
  }
}
\`\`\`

### Assertions Class Pattern

Dedicated class for verification methods:

\`\`\`typescript
import { expect } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { AssistantLocators } from './assistant_locators';

export class AssistantAssertions {
  constructor(
    private readonly page: ScoutPage,
    private readonly locators: AssistantLocators
  ) {}

  /**
   * Expects a message to be sent and visible in the message list
   */
  async expectMessageSent(messageText: string) {
    const message = this.locators.messageList.locator('text=' + messageText);
    await expect(message).toBeVisible();
  }

  /**
   * Expects the conversation title to match
   */
  async expectConversationTitle(title: string) {
    await expect(this.locators.conversationTitle).toHaveText(title);
  }

  /**
   * Expects the conversation title to contain text
   */
  async expectConversationTitleContains(text: string) {
    await expect(this.locators.conversationTitle).toContainText(text);
  }

  /**
   * Expects a specific connector to be selected
   */
  async expectConnectorSelected(connectorName: string) {
    await expect(this.locators.connectorSelector).toHaveText(connectorName);
  }

  /**
   * Expects the user prompt to be empty
   */
  async expectUserPromptEmpty() {
    await expect(this.locators.userPromptTextarea).toHaveValue('');
  }

  /**
   * Expects an error response from the AI
   */
  async expectErrorResponse() {
    const errorMessage = this.page.testSubj.locator('errorMessage');
    await expect(errorMessage).toBeVisible({ timeout: 30000 });
  }
}
\`\`\`

## Simpler Page Object Pattern

For simpler pages, use a single-class pattern:

\`\`\`typescript
import type { ScoutPage, Locator } from '@kbn/scout';
import { expect } from '@kbn/scout';

/**
 * Page Object for the Alert Details Right Panel
 */
export class AlertDetailsRightPanelPage {
  public detailsFlyoutCloseIcon: Locator;
  public detailsFlyoutHeaderTitle: Locator;

  constructor(private readonly page: ScoutPage) {
    this.detailsFlyoutHeaderTitle = this.page.testSubj.locator(
      'securitySolutionFlyoutAlertTitleText'
    );
    this.detailsFlyoutCloseIcon = this.page.testSubj.locator('euiFlyoutCloseButton');
  }

  async closeFlyout() {
    await this.detailsFlyoutCloseIcon.click();
  }
}
\`\`\`

## Key Principles

1. **Separation of Concerns**: Locators, actions, and assertions in separate classes
2. **Composition**: Main class composes specialized action classes
3. **Dependency Injection**: Pass dependencies through constructor
4. **JSDoc Documentation**: Comprehensive documentation with examples
5. **Section Headers**: Use comment separators for organization
6. **Public Readonly**: Expose action classes as public readonly properties
7. **Async Methods**: All interaction methods are async
8. **Getter Pattern**: Use getters for locators, methods for actions
9. **Error Handling**: Gracefully handle missing elements (onboarding modals, etc.)
10. **Force Click Documented**: Explain when and why force click is needed
`;
