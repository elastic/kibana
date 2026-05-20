import type { TutorialContext } from '../../services/tutorials/lib/tutorials_registry_types';
/**
 * Returns valid configuration for a beat.yml file for adding the space id
 * if there is an active space and that space is not the default one.
 *
 * @param {object} context - Context object generated from tutorial factory (see #22760)
 */
export declare function getSpaceIdForBeatsTutorial(context?: TutorialContext): string;
