import type {ContentItemDetails} from "./types";

export class ContentItem<T = unknown> {
  constructor(public readonly details: ContentItemDetails<T>) {}

  public get id(): string {
    return this.details.id;
  }

  public get title(): string {
    return this.details.fields.title || '';
  }
}
