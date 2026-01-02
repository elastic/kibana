import { Serializable, SerializableRecord } from "@kbn/utility-types";
import type { Reference } from '@kbn/content-management-utils';
import { dynamicActionsPersistableState } from "./dynamic_actions/dynamic_action_enhancement";

export const enhancementsPersistableState = {
  extract: (enhancementsState: SerializableRecord) => {
    const outputEnhancementsState: Record<string, Serializable> = {};
    const extractedReferences: Reference[] = [];
    Object.keys(enhancementsState).forEach((key) => {
      if (!enhancementsState[key]) return;
      const { state, references } = key === 'dynamicActions'
        ? dynamicActionsPersistableState.extract(enhancementsState[key] as SerializableRecord)
        : { state: enhancementsState[key], references: [] };
      outputEnhancementsState[key] = state as Serializable;
      extractedReferences.push(...references);
    });

    return {
      state: outputEnhancementsState,
      references: extractedReferences,
    };
  },
  inject: (enhancementsState: SerializableRecord, references: Reference[]) => {
    const outputEnhancementsState: Record<string, Serializable> = {};
    Object.keys(enhancementsState).forEach((key) => {
      if (!enhancementsState[key]) return;
      outputEnhancementsState[key] = key === 'dynamicActions'
        ? dynamicActionsPersistableState.inject(enhancementsState[key] as SerializableRecord, references)
        : enhancementsState[key];
    });

    return outputEnhancementsState;
  },
}
/*
export const dynamicActionEnhancement = (
  uiActionsEnhanced: UiActionsServiceEnhancements
): EnhancementRegistryDefinition => {
  return {
    id: 'dynamicActions',
    telemetry: (
      state: SerializableRecord,
      telemetryData: Record<string, string | number | boolean>
    ) => {
      return uiActionsEnhanced.telemetry(state as DynamicActionsState, telemetryData);
    },
    extract: (state: SerializableRecord) => {
      return uiActionsEnhanced.extract(state as DynamicActionsState);
    },
    inject: (state: SerializableRecord, references: SavedObjectReference[]) => {
      return uiActionsEnhanced.inject(state as DynamicActionsState, references);
    },
  } as EnhancementRegistryDefinition<SerializableRecord>;
};*/