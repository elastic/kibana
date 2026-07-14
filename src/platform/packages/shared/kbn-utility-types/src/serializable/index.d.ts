export type JsonValue = null | boolean | number | string | JsonObject | JsonArray;
export interface JsonObject {
    [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {
}
export type Serializable = string | number | boolean | null | undefined | SerializableArray | SerializableRecord;
export interface SerializableArray extends Array<Serializable> {
}
export interface SerializableRecord extends Record<string, Serializable> {
}
