import { i18n } from '@kbn/i18n';

import { schema } from '@kbn/config-schema';
import { AIAssistantType } from '../../common/ai_assistant_type';
import { UiSettingsParams } from '@kbn/core/packages/ui-settings/common';
import { ONLY_IN_THEIR_SOLUTIONS, OBSERVABILITY_IN_OTHER_APPS, SECURITY_IN_OTHER_APPS, HIDE_ALL_ASSISTANTS } from './translations';

// Define the classicSetting with proper typing
export const classicSetting: Omit<UiSettingsParams<AIAssistantType>, 'value'> = {
    name: i18n.translate('aiAssistantManagementSelection.preferredAIAssistantTypeSettingName', {
        defaultMessage: 'AI Assistant visibility',
    }),
    description: i18n.translate(
        'aiAssistantManagementSelection.preferredAIAssistantTypeSettingDescription',
        {
            defaultMessage:
                'Choose where and which AI Assistants are available. You can limit the AI Assistants to their own solutions, show either the Observability and Search AI Assistants or the Security AI Assistant in other Kibana apps, or hide AI Assistants entirely.',
        }
    ),
    schema: schema.oneOf(
        [
            schema.literal(AIAssistantType.Default),
            schema.literal(AIAssistantType.Observability),
            schema.literal(AIAssistantType.Security),
            schema.literal(AIAssistantType.Never),
        ],
        { defaultValue: AIAssistantType.Default }
    ),
    // Convert enum values to strings to satisfy UiSettingsParams type
    options: [
        AIAssistantType.Default,
        AIAssistantType.Observability,
        AIAssistantType.Security,
        AIAssistantType.Never,
    ] as (typeof AIAssistantType)[keyof typeof AIAssistantType][],
    type: "select" as const,
    optionLabels: {
        [AIAssistantType.Default]: ONLY_IN_THEIR_SOLUTIONS,
        [AIAssistantType.Observability]: OBSERVABILITY_IN_OTHER_APPS,
        [AIAssistantType.Security]: SECURITY_IN_OTHER_APPS,
        [AIAssistantType.Never]: HIDE_ALL_ASSISTANTS,
    },
    requiresPageReload: true,
    solution: "classic"
}