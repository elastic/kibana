import type { LensApiState, NarrowByType } from "./schema";
import { LensConfigBuilder } from "./config_builder";
import { stripDefaults, appendDefaults } from "./utils";

// sample metric configuration
const test: NarrowByType<LensApiState, 'metric'> = {
  type: 'metric',
  dataset: {
    type: 'index',
    index: 'test',
    time_field: 'test'
  },
  metric: {
    operation: 'value',
    column: 'test',
    

  },
  secondary_metric: {
    operation: 'last_value',
    field: 'test',
  },
  breakdown_by: {
    operation: 'terms',
    fields: ['test'],
    size: 5,
    increase_accuracy: true,
    collapse_by: 'avg',
  },
  ignore_global_filters: true,
  samplings: 1,
}

const tryMe = async () => {
  const configBuilder = new LensConfigBuilder({} as any, {} as any);

  // convert to lens internal state
  const lensInternalState = await configBuilder.build(test);

  // convert back to api state
  const lensApiState = await configBuilder.reverseBuild(lensInternalState);

  // append all default values
  const lensApiStateWithDefaults = appendDefaults(lensApiState.config);

  // strip all default values
  const lensApiStateWithoutDefaults = stripDefaults(lensApiStateWithDefaults);

  console.log(lensApiStateWithoutDefaults);
}

tryMe();