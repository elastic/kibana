import { i18n } from '@kbn/i18n';

import { schema } from '@kbn/config-schema';
import { AIAssistantType } from '../../common/ai_assistant_type';
import { UiSettingsParams } from '@kbn/core/packages/ui-settings/common';
import { SHOW_SECURITY, HIDE_ASSISTANT } from './translations';

// Define the securitySolutionSetting with proper typing
export const securitySolutionSetting: Omit<UiSettingsParams<AIAssistantType.Security | AIAssistantType.Never>, 'value'> = {
    name: i18n.translate('aiAssistantManagementSelection.securitySolutionSetting.preferredAIAssistantTypeSettingName', {
        defaultMessage: 'AI Assistant visibility',
    }),
    description: i18n.translate(
        'aiAssistantManagementSelection.securitySolutionSetting.preferredAIAssistantTypeSettingDescription',
        {
            defaultMessage:
                'Choose if the Security AI Assistant is available. Show the Security AI Assistant, or hide the Assistant entirely.',
        }
    ),
    schema: schema.oneOf(
        [
            schema.literal(AIAssistantType.Security),
            schema.literal(AIAssistantType.Never),
        ],
        { defaultValue: AIAssistantType.Security }
    ),
    // Convert enum values to strings to satisfy UiSettingsParams type
    options: [
        AIAssistantType.Security,
        AIAssistantType.Never,
    ] as (typeof AIAssistantType)[keyof typeof AIAssistantType][],
    type: "select" as const,
    optionLabels: {
        [AIAssistantType.Security]: SHOW_SECURITY,
        [AIAssistantType.Never]: HIDE_ASSISTANT,
    },
    requiresPageReload: true,
    solution: "security"
}