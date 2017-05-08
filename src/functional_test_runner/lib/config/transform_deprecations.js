import { createTransform, Deprecations } from '../../../deprecation';

export const transformDeprecations = createTransform([
  Deprecations.unused('servers.webdriver')
]);
