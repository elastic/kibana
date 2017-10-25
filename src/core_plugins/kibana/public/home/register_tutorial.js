import { TutorialsRegistryProvider } from 'ui/registry/tutorials';

/**
 * Wraps validation, registration, and any other boiler plate activities to avoid exposing implemenation details
 * to tutorial authors.
 *
 * @params {Function} specProvider - Function executed to generate tutorial spec
 */
export function registerTutorial(specProvider) {
  const spec = specProvider();

  // TODO validate spec

  TutorialsRegistryProvider.register(() => {
    return spec;
  });
}
