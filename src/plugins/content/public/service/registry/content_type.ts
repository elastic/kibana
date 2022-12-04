import {ContentItem} from "./content_item";
import type {ContentTypeDetails} from "./types";

export class ContentType<T = unknown> {
  constructor(public readonly details: ContentTypeDetails<T>) {}

  public get id(): string {
    return this.details.id;
  }

  public async read(id: string): Promise<ContentItem<T>> {
    const typeDetails = this.details;
    if (!typeDetails.operations.read)
      throw new Error(`Content type ${this.id} does not support read operation`);
    const itemDetails = await typeDetails.operations.read(id);
    const item = new ContentItem<T>(itemDetails);
    return item;
  }
}
