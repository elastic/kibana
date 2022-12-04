import type {ContentTypeDetails} from "./types";

export class ContentType<T = unknown> {
  constructor(public readonly details: ContentTypeDetails<T>) {}

  public get id(): string {
    return this.details.id;
  }
}
