/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ELASTIC_DISCOVER_ASSISTANT = i18n.translate(
  'discover.assistant.elasticDiscoverAssistantTitle',
  {
    defaultMessage: 'Elastic Discover Assistant',
  }
);

export const EVENT_SUMMARY_CONVERSATION_ID = i18n.translate(
  'discover.assistant.eventSummaryViewConversationId',
  {
    defaultMessage: 'Event summary',
  }
);

export const WELCOME_CONVERSATION_TITLE = i18n.translate(
  'discover.assistant.welcomeConversationTitle',
  {
    defaultMessage: 'Welcome',
  }
);

// Welcome conversation
export const WELCOME_GENERAL = i18n.translate('discover.assistant.welcomeGeneralPrompt', {
  defaultMessage:
    'Welcome to your Elastic Assistant! I am your 100% open-code portal into your Elastic life. In time, I will be able to answer questions and provide assistance across all your information in Elastic, and oh-so much more. Till then, I hope this early preview will open your mind to the possibilities of what we can create when we work together, in the open. Cheers!',
});

export const WELCOME_GENERAL_2 = i18n.translate('discover.assistant.welcomeGeneral2Prompt', {
  defaultMessage:
    "First things first, we'll need to set up a Generative AI Connector to get this chat experience going! With the Generative AI Connector, you'll be able to configure access to either an Azure OpenAI Service or OpenAI API account, but you better believe you'll be able to deploy your own models within your Elastic Cloud instance and use those here in the future... 😉",
});

export const WELCOME_GENERAL_3 = i18n.translate('discover.assistant.welcomeGeneral3Prompt', {
  defaultMessage: 'Go ahead and click the add connector button below to continue the conversation!',
});

// Base System Prompts

export const YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT = i18n.translate(
  'discover.assistant.content.prompts.system.youAreAHelpfulExpertAssistant',
  {
    defaultMessage:
      'You are a helpful, expert assistant who only answers questions about the Elastic Stack.',
  }
);

export const USE_THE_FOLLOWING_CONTEXT_TO_ANSWER = i18n.translate(
  'discover.assistant.content.prompts.system.useTheFollowingContextToAnswer',
  {
    defaultMessage: 'Use the following context to answer questions:',
  }
);

export const IF_YOU_DONT_KNOW_THE_ANSWER = i18n.translate(
  'discover.assistant.content.prompts.system.ifYouDontKnowTheAnswer',
  {
    defaultMessage: 'Do not answer questions unrelated to the Elastic Stack.',
  }
);

export const SUPERHERO_PERSONALITY = i18n.translate(
  'discover.assistant.content.prompts.system.superheroPersonality',
  {
    defaultMessage:
      'Provide the most detailed and relevant answer possible, as if you were relaying this information back to an experienced data analyst.',
  }
);

export const DEFAULT_SYSTEM_PROMPT_NON_I18N = `${YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT} ${IF_YOU_DONT_KNOW_THE_ANSWER}
${USE_THE_FOLLOWING_CONTEXT_TO_ANSWER}`;

export const DEFAULT_SYSTEM_PROMPT_NAME = i18n.translate(
  'discover.assistant.content.prompts.system.defaultSystemPromptName',
  {
    defaultMessage: 'Default system prompt',
  }
);

export const SUPERHERO_SYSTEM_PROMPT_NON_I18N = `${YOU_ARE_A_HELPFUL_EXPERT_ASSISTANT} ${IF_YOU_DONT_KNOW_THE_ANSWER}
${SUPERHERO_PERSONALITY}
${USE_THE_FOLLOWING_CONTEXT_TO_ANSWER}`;

export const SUPERHERO_SYSTEM_PROMPT_NAME = i18n.translate(
  'discover.assistant.content.prompts.system.superheroSystemPromptName',
  {
    defaultMessage: 'Enhanced system prompt',
  }
);

// Base Quick Prompts

export const EVENT_SUMMARIZATION_TITLE = i18n.translate(
  'discover.assistant.content.prompts.quick.eventSummarizationTitle',
  {
    defaultMessage: 'Event summarization',
  }
);

export const EVENT_SUMMARIZATION_PROMPT = i18n.translate(
  'discover.assistant.content.prompts.quick.eventSummarizationPrompt',
  {
    defaultMessage:
      'As an expert in data and log analysis, provide a breakdown of the attached event and summarize what it might mean for my organization.',
  }
);

export const EVENT_CONTEXT_DESCRIPTION = i18n.translate(
  'discover.assistant.content.prompts.context.eventContextDescription',
  {
    defaultMessage: 'Selected Event',
  }
);
