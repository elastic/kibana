import { Schema, typeOfSchema } from '../../types/schema';

const createSavedObjectsSchema = (schema: Schema) =>
  schema.object({
    placeholder: schema.string({ defaultValue: 'placeholder' })
  });

const savedObjectsConfigType = typeOfSchema(createSavedObjectsSchema);
type SavedObjectsConfigType = typeof savedObjectsConfigType;

export class SavedObjectsConfig {
  /**
   * @internal
   */
  static createSchema = createSavedObjectsSchema;
  readonly placeholder: string;

  /**
   * @internal
   */
  constructor(config: SavedObjectsConfigType) {
    this.placeholder = config.placeholder;
  }
}

