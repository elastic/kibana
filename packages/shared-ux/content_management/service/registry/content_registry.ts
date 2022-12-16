import {ContentType} from "./content_type";
import type {ContentTypeDetails} from "./types";

export class ContentRegistry {
  private readonly types: Map<string, ContentType> = new Map();

  public registerType(details: ContentTypeDetails) {
    const type = new ContentType(details);
    this.types.set(type.getId(), type);
  }

  public getTypes(): ContentType[] {
    return Array.from(this.types.values());
  }

  public type(id: string): ContentType | undefined {
    return this.types.get(id);
  }
}
