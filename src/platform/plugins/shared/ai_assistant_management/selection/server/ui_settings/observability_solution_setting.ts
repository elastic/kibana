import { i18n } from '@kbn/i18n';

import { schema } from '@kbn/config-schema';
import { AIAssistantType } from '../../common/ai_assistant_type';
import { UiSettingsParams } from '@kbn/core/packages/ui-settings/common';
import { SHOW_OBSERVABILITY, HIDE_ASSISTANT } from './translations';

// Define the classicSetting with proper typing
export const observabilitySolutionSetting: Omit<UiSettingsParams<AIAssistantType.Never | AIAssistantType.Observability>, 'value'> = {
    name: i18n.translate('aiAssistantManagementSelection.observabilitySolutionSetting.preferredAIAssistantTypeSettingName', {
        defaultMessage: 'AI Assistant visibility',
    }),
    description: i18n.translate(
        'aiAssistantManagementSelection.observabilitySolutionSetting.preferredAIAssistantTypeSettingDescription',
        {
            defaultMessage: 'Choose if the Observability AI Assistant is available. Show the Observability AI Assistant, or hide the Assistant entirely.',
        }
    ),
    schema: schema.oneOf(
        [
            schema.literal(AIAssistantType.Observability),
            schema.literal(AIAssistantType.Never),
        ],
        { defaultValue: AIAssistantType.Observability }
    ),
    // Convert enum values to strings to satisfy UiSettingsParams type
    options: [
        AIAssistantType.Observability,
        AIAssistantType.Never,
    ] as (typeof AIAssistantType)[keyof typeof AIAssistantType][],
    type: "select" as const,
    optionLabels: {
        [AIAssistantType.Observability]: SHOW_OBSERVABILITY,
        [AIAssistantType.Never]: HIDE_ASSISTANT,
    },
    requiresPageReload: true,
    solution: ['oblt']
}