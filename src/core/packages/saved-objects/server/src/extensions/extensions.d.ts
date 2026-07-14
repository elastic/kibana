import type { ISavedObjectsEncryptionExtension } from './encryption';
import type { ISavedObjectsSecurityExtension } from './security';
import type { ISavedObjectsSpacesExtension } from './spaces';
/**
 * The SavedObjectsExtensions interface contains the intefaces for three
 * extensions to the saved objects repository. These extensions augment
 * the funtionality of the saved objects repository to provide encryption,
 * security, and spaces features.
 */
export interface SavedObjectsExtensions {
    /** The encryption extension - handles encrypting and decrypting attributes of saved objects */
    encryptionExtension?: ISavedObjectsEncryptionExtension;
    /** The security extension - handles action authorization, audit logging, and space redaction */
    securityExtension?: ISavedObjectsSecurityExtension;
    /** The spaces extension - handles retrieving the current space and retrieving available spaces */
    spacesExtension?: ISavedObjectsSpacesExtension;
}
export declare const ENCRYPTION_EXTENSION_ID: "encryptedSavedObjects";
export declare const SECURITY_EXTENSION_ID: "security";
export declare const SPACES_EXTENSION_ID: "spaces";
