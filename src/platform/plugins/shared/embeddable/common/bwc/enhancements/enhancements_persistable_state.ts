
export const enhancementsPersistableState = {
  
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