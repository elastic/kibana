# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

class AWS::DynamoDB::Client::V20111205 < AWS::DynamoDB::Client

  # client methods #

  # @!method batch_get_item(options = {})
  # Calls the BatchGetItem API operation.
  # @param [Hash] options
  #
  #   * `:request_items` - *required* - (Hash<String,Hash>) A map of one or
  #     more table names and, for each table, the corresponding primary
  #     keys for the items to retrieve. Each table name can be invoked only
  #     once. Each element in the map consists of the following: Keys - An
  #     array of primary key attribute values that define specific items in
  #     the table. AttributesToGet - One or more attributes to be retrieved
  #     from the table or index. By default, all attributes are returned.
  #     If a specified attribute is not found, it does not appear in the
  #     result. ConsistentRead - If `true` , a strongly consistent read is
  #     used; if `false` (the default), an eventually consistent read is
  #     used.
  #     * `:keys` - *required* - (Array<Hash>) Represents the primary key
  #       attribute values that define the items and the attributes
  #       associated with the items.
  #       * `:hash_key_element` - *required* - (Hash) A hash key element is
  #         treated as the primary key, and can be a string or a number.
  #         Single attribute primary keys have one index value. The value
  #         can be String, Number, StringSet, NumberSet.
  #         * `:s` - (String) Represents a String data type
  #         * `:n` - (String) Represents a Number data type
  #         * `:b` - (String) Represents a Binary data type
  #         * `:ss` - (Array<String>) Represents a String set data type
  #         * `:ns` - (Array<String>) Represents a Number set data type
  #         * `:bs` - (Array<String>) Represents a Binary set data type
  #       * `:range_key_element` - (Hash) A range key element is treated as
  #         a secondary key (used in conjunction with the primary key), and
  #         can be a string or a number, and is only used for
  #         hash-and-range primary keys. The value can be String, Number,
  #         StringSet, NumberSet.
  #         * `:s` - (String) Represents a String data type
  #         * `:n` - (String) Represents a Number data type
  #         * `:b` - (String) Represents a Binary data type
  #         * `:ss` - (Array<String>) Represents a String set data type
  #         * `:ns` - (Array<String>) Represents a Number set data type
  #         * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:attributes_to_get` - (Array<String>) Represents one or more
  #       attributes to retrieve from the table or index. If no attribute
  #       names are specified then all attributes will be returned. If any
  #       of the specified attributes are not found, they will not appear
  #       in the result.
  #     * `:consistent_read` - (Boolean) Represents the consistency of a
  #       read operation. If set to `true` , then a strongly consistent
  #       read is used; otherwise, an eventually consistent read is used.
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `Responses` - (Hash<String,Hash>)
  #     * `member` - (Hash<String,Hash>)
  #       * `S` - (String)
  #       * `N` - (String)
  #       * `B` - (String)
  #       * `SS` - (Array<String>)
  #       * `NS` - (Array<String>)
  #       * `BS` - (Array<Blob>)
  #     * `ConsumedCapacityUnits` - (Numeric)
  #   * `UnprocessedKeys` - (Hash<String,Hash>)
  #     * `Keys` - (Array<Hash>)
  #       * `HashKeyElement` - (Hash)
  #         * `S` - (String)
  #         * `N` - (String)
  #         * `B` - (String)
  #         * `SS` - (Array<String>)
  #         * `NS` - (Array<String>)
  #         * `BS` - (Array<Blob>)
  #       * `RangeKeyElement` - (Hash)
  #         * `S` - (String)
  #         * `N` - (String)
  #         * `B` - (String)
  #         * `SS` - (Array<String>)
  #         * `NS` - (Array<String>)
  #         * `BS` - (Array<Blob>)
  #     * `AttributesToGet` - (Array<String>)
  #     * `ConsistentRead` - (Boolean)

  # @!method batch_write_item(options = {})
  # Calls the BatchWriteItem API operation.
  # @param [Hash] options
  #
  #   * `:request_items` - *required* - (Hash<String,Array<Hash>>) A map of
  #     one or more table names and, for each table, a list of operations
  #     to be performed (DeleteRequest or PutRequest). Each element in the
  #     map consists of the following: DeleteRequest - Perform a DeleteItem
  #     operation on the specified item. The item to be deleted is
  #     identified by a Key subelement: Key - A map of primary key
  #     attribute values that uniquely identify the item. Each entry in
  #     this map consists of an attribute name and an attribute value.
  #     PutRequest - Perform a PutItem operation on the specified item. The
  #     item to be put is identified by an Item subelement: Item - A map of
  #     attributes and their values. Each entry in this map consists of an
  #     attribute name and an attribute value. Attribute values must not be
  #     null; string and binary type attributes must have lengths greater
  #     than zero; and set type attributes must not be empty. Requests that
  #     contain empty values will be rejected with a ValidationException.
  #     If you specify any attributes that are part of an index key, then
  #     the data types for those attributes must match those of the schema
  #     in the table's attribute definition.
  #     * `:put_request` - (Hash) Represents a request to perform a
  #       DeleteItem operation.
  #       * `:item` - *required* - (Hash<String,Hash>) A map of attribute
  #         name to attribute values, representing the primary key of an
  #         item to be processed by PutItem. All of the table's primary key
  #         attributes must be specified, and their data types must match
  #         those of the table's key schema. If any attributes are present
  #         in the item which are part of an index key schema for the
  #         table, their types must match the index key schema.
  #         * `:s` - (String) Represents a String data type
  #         * `:n` - (String) Represents a Number data type
  #         * `:b` - (String) Represents a Binary data type
  #         * `:ss` - (Array<String>) Represents a String set data type
  #         * `:ns` - (Array<String>) Represents a Number set data type
  #         * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:delete_request` - (Hash) Represents a request to perform a
  #       PutItem operation.
  #       * `:key` - *required* - (Hash) A map of attribute name to
  #         attribute values, representing the primary key of the item to
  #         delete. All of the table's primary key attributes must be
  #         specified, and their data types must match those of the table's
  #         key schema.
  #         * `:hash_key_element` - *required* - (Hash) A hash key element
  #           is treated as the primary key, and can be a string or a
  #           number. Single attribute primary keys have one index value.
  #           The value can be String, Number, StringSet, NumberSet.
  #           * `:s` - (String) Represents a String data type
  #           * `:n` - (String) Represents a Number data type
  #           * `:b` - (String) Represents a Binary data type
  #           * `:ss` - (Array<String>) Represents a String set data type
  #           * `:ns` - (Array<String>) Represents a Number set data type
  #           * `:bs` - (Array<String>) Represents a Binary set data type
  #         * `:range_key_element` - (Hash) A range key element is treated
  #           as a secondary key (used in conjunction with the primary
  #           key), and can be a string or a number, and is only used for
  #           hash-and-range primary keys. The value can be String, Number,
  #           StringSet, NumberSet.
  #           * `:s` - (String) Represents a String data type
  #           * `:n` - (String) Represents a Number data type
  #           * `:b` - (String) Represents a Binary data type
  #           * `:ss` - (Array<String>) Represents a String set data type
  #           * `:ns` - (Array<String>) Represents a Number set data type
  #           * `:bs` - (Array<String>) Represents a Binary set data type
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `Responses` - (Hash<String,Hash>)
  #     * `ConsumedCapacityUnits` - (Numeric)
  #   * `UnprocessedItems` - (Hash<String,Hash>)
  #     * `value` - (Array<Hash>)
  #       * `PutRequest` - (Hash)
  #         * `Item` - (Hash<String,Hash>)
  #           * `S` - (String)
  #           * `N` - (String)
  #           * `B` - (String)
  #           * `SS` - (Array<String>)
  #           * `NS` - (Array<String>)
  #           * `BS` - (Array<Blob>)
  #       * `DeleteRequest` - (Hash)
  #         * `Key` - (Hash)
  #           * `HashKeyElement` - (Hash)
  #             * `S` - (String)
  #             * `N` - (String)
  #             * `B` - (String)
  #             * `SS` - (Array<String>)
  #             * `NS` - (Array<String>)
  #             * `BS` - (Array<Blob>)
  #           * `RangeKeyElement` - (Hash)
  #             * `S` - (String)
  #             * `N` - (String)
  #             * `B` - (String)
  #             * `SS` - (Array<String>)
  #             * `NS` - (Array<String>)
  #             * `BS` - (Array<Blob>)

  # @!method create_table(options = {})
  # Calls the CreateTable API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table to
  #     create.
  #   * `:key_schema` - *required* - (Hash) Specifies the attributes that
  #     make up the primary key for the table. The attributes in KeySchema
  #     must also be defined in the AttributeDefinitions array. For more
  #     information, see Data Model . Each KeySchemaElement in the array is
  #     composed of: AttributeName - The name of this key attribute.
  #     KeyType - Determines whether the key attribute is HASH or RANGE.
  #     For a primary key that consists of a hash attribute, you must
  #     specify exactly one element with a KeyType of HASH. For a primary
  #     key that consists of hash and range attributes, you must specify
  #     exactly two elements, in this order: The first element must have a
  #     KeyType of HASH, and the second element must have a KeyType of
  #     RANGE. For more information, see Specifying the Primary Key .
  #     * `:hash_key_element` - *required* - (Hash) A hash key element is
  #       treated as the primary key, and can be a string or a number.
  #       Single attribute primary keys have one index value. The value can
  #       be String, Number, StringSet, NumberSet.
  #       * `:attribute_name` - *required* - (String) Represents the name
  #         of a key attribute.
  #       * `:attribute_type` - *required* - (String) The AttributeType of
  #         the KeySchemaElement which can be a String or a Number. Valid
  #         values include:
  #         * `S`
  #         * `N`
  #         * `B`
  #     * `:range_key_element` - (Hash) A range key element is treated as a
  #       secondary key (used in conjunction with the primary key), and can
  #       be a string or a number, and is only used for hash-and-range
  #       primary keys. The value can be String, Number, StringSet,
  #       NumberSet.
  #       * `:attribute_name` - *required* - (String) Represents the name
  #         of a key attribute.
  #       * `:attribute_type` - *required* - (String) The AttributeType of
  #         the KeySchemaElement which can be a String or a Number. Valid
  #         values include:
  #         * `S`
  #         * `N`
  #         * `B`
  #   * `:provisioned_throughput` - *required* - (Hash)
  #     * `:read_capacity_units` - *required* - (Integer) The maximum
  #       number of strongly consistent reads consumed per second before
  #       returns a ThrottlingException. For more information, see
  #       Specifying Read and Write Requirements .
  #     * `:write_capacity_units` - *required* - (Integer) The maximum
  #       number of writes consumed per second before returns a
  #       ThrottlingException. For more information, see Specifying Read
  #       and Write Requirements .
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `TableDescription` - (Hash)
  #     * `TableName` - (String)
  #     * `KeySchema` - (Hash)
  #       * `HashKeyElement` - (Hash)
  #         * `AttributeName` - (String)
  #         * `AttributeType` - (String)
  #       * `RangeKeyElement` - (Hash)
  #         * `AttributeName` - (String)
  #         * `AttributeType` - (String)
  #     * `TableStatus` - (String)
  #     * `CreationDateTime` - (Time)
  #     * `ProvisionedThroughput` - (Hash)
  #       * `LastIncreaseDateTime` - (Time)
  #       * `LastDecreaseDateTime` - (Time)
  #       * `NumberOfDecreasesToday` - (Integer)
  #       * `ReadCapacityUnits` - (Integer)
  #       * `WriteCapacityUnits` - (Integer)
  #     * `TableSizeBytes` - (Integer)
  #     * `ItemCount` - (Integer)

  # @!method delete_item(options = {})
  # Calls the DeleteItem API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table from
  #     which to delete the item.
  #   * `:key` - *required* - (Hash) A map of attribute names to
  #     AttributeValue objects, representing the primary key of the item to
  #     delete.
  #     * `:hash_key_element` - *required* - (Hash) A hash key element is
  #       treated as the primary key, and can be a string or a number.
  #       Single attribute primary keys have one index value. The value can
  #       be String, Number, StringSet, NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:range_key_element` - (Hash) A range key element is treated as a
  #       secondary key (used in conjunction with the primary key), and can
  #       be a string or a number, and is only used for hash-and-range
  #       primary keys. The value can be String, Number, StringSet,
  #       NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #   * `:expected` - (Hash<String,Hash>) A map of attribute/condition
  #     pairs. This is the conditional block for the DeleteItemoperation.
  #     All the conditions must be met for the operation to succeed.
  #     * `:value` - (Hash) Specify whether or not a value already exists
  #       and has a specific content for the attribute name-value pair.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:exists` - (Boolean) Causes to evaluate the value before
  #       attempting a conditional operation: If Exists is `true` , will
  #       check to see if that attribute value already exists in the table.
  #       If it is found, then the operation succeeds. If it is not found,
  #       the operation fails with a ConditionalCheckFailedException. If
  #       Exists is `false` , assumes that the attribute value does not
  #       exist in the table. If in fact the value does not exist, then the
  #       assumption is valid and the operation succeeds. If the value is
  #       found, despite the assumption that it does not exist, the
  #       operation fails with a ConditionalCheckFailedException. The
  #       default setting for Exists is `true` . If you supply a Value all
  #       by itself, assumes the attribute exists: You don't have to set
  #       Exists to `true` , because it is implied. returns a
  #       ValidationException if: Exists is `true` but there is no Value to
  #       check. (You expect a value to exist, but don't specify what that
  #       value is.) Exists is `false` but you also specify a Value. (You
  #       cannot expect an attribute to have a value, while also expecting
  #       it not to exist.) If you specify more than one condition for
  #       Exists, then all of the conditions must evaluate to `true` . (In
  #       other words, the conditions are ANDed together.) Otherwise, the
  #       conditional operation will fail.
  #   * `:return_values` - (String) Use ReturnValues if you want to get the
  #     item attributes as they appeared before they were deleted. For
  #     DeleteItem, the valid values are: NONE - If ReturnValues is not
  #     specified, or if its value is NONE, then nothing is returned. (This
  #     is the default for ReturnValues.) ALL_OLD - The content of the old
  #     item is returned. Valid values include:
  #     * `NONE`
  #     * `ALL_OLD`
  #     * `UPDATED_OLD`
  #     * `ALL_NEW`
  #     * `UPDATED_NEW`
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `Attributes` - (Hash<String,Hash>)
  #     * `S` - (String)
  #     * `N` - (String)
  #     * `B` - (String)
  #     * `SS` - (Array<String>)
  #     * `NS` - (Array<String>)
  #     * `BS` - (Array<Blob>)
  #   * `ConsumedCapacityUnits` - (Numeric)

  # @!method delete_table(options = {})
  # Calls the DeleteTable API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table to
  #     delete.
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `TableDescription` - (Hash)
  #     * `TableName` - (String)
  #     * `KeySchema` - (Hash)
  #       * `HashKeyElement` - (Hash)
  #         * `AttributeName` - (String)
  #         * `AttributeType` - (String)
  #       * `RangeKeyElement` - (Hash)
  #         * `AttributeName` - (String)
  #         * `AttributeType` - (String)
  #     * `TableStatus` - (String)
  #     * `CreationDateTime` - (Time)
  #     * `ProvisionedThroughput` - (Hash)
  #       * `LastIncreaseDateTime` - (Time)
  #       * `LastDecreaseDateTime` - (Time)
  #       * `NumberOfDecreasesToday` - (Integer)
  #       * `ReadCapacityUnits` - (Integer)
  #       * `WriteCapacityUnits` - (Integer)
  #     * `TableSizeBytes` - (Integer)
  #     * `ItemCount` - (Integer)

  # @!method describe_table(options = {})
  # Calls the DescribeTable API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table to
  #     describe.
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `Table` - (Hash)
  #     * `TableName` - (String)
  #     * `KeySchema` - (Hash)
  #       * `HashKeyElement` - (Hash)
  #         * `AttributeName` - (String)
  #         * `AttributeType` - (String)
  #       * `RangeKeyElement` - (Hash)
  #         * `AttributeName` - (String)
  #         * `AttributeType` - (String)
  #     * `TableStatus` - (String)
  #     * `CreationDateTime` - (Time)
  #     * `ProvisionedThroughput` - (Hash)
  #       * `LastIncreaseDateTime` - (Time)
  #       * `LastDecreaseDateTime` - (Time)
  #       * `NumberOfDecreasesToday` - (Integer)
  #       * `ReadCapacityUnits` - (Integer)
  #       * `WriteCapacityUnits` - (Integer)
  #     * `TableSizeBytes` - (Integer)
  #     * `ItemCount` - (Integer)

  # @!method get_item(options = {})
  # Calls the GetItem API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table
  #     containing the requested item.
  #   * `:key` - *required* - (Hash) A map of attribute names to
  #     AttributeValue objects, representing the primary key of the item to
  #     retrieve.
  #     * `:hash_key_element` - *required* - (Hash) A hash key element is
  #       treated as the primary key, and can be a string or a number.
  #       Single attribute primary keys have one index value. The value can
  #       be String, Number, StringSet, NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:range_key_element` - (Hash) A range key element is treated as a
  #       secondary key (used in conjunction with the primary key), and can
  #       be a string or a number, and is only used for hash-and-range
  #       primary keys. The value can be String, Number, StringSet,
  #       NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #   * `:attributes_to_get` - (Array<String>)
  #   * `:consistent_read` - (Boolean)
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `Item` - (Hash<String,Hash>)
  #     * `S` - (String)
  #     * `N` - (String)
  #     * `B` - (String)
  #     * `SS` - (Array<String>)
  #     * `NS` - (Array<String>)
  #     * `BS` - (Array<Blob>)
  #   * `ConsumedCapacityUnits` - (Numeric)

  # @!method list_tables(options = {})
  # Calls the ListTables API operation.
  # @param [Hash] options
  #
  #   * `:exclusive_start_table_name` - (String) The name of the table that
  #     starts the list. If you already ran a ListTables operation and
  #     received a LastEvaluatedTableName value in the response, use that
  #     value here to continue the list.
  #   * `:limit` - (Integer) A maximum number of table names to return.
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `TableNames` - (Array<String>)
  #   * `LastEvaluatedTableName` - (String)

  # @!method put_item(options = {})
  # Calls the PutItem API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table to
  #     contain the item.
  #   * `:item` - *required* - (Hash<String,Hash>) A map of attribute
  #     name/value pairs, one for each attribute. Only the primary key
  #     attributes are required; you can optionally provide other attribute
  #     name-value pairs for the item. If you specify any attributes that
  #     are part of an index key, then the data types for those attributes
  #     must match those of the schema in the table's attribute definition.
  #     For more information about primary keys, see Primary Key . Each
  #     element in the Item map is an AttributeValue object.
  #     * `:s` - (String) Represents a String data type
  #     * `:n` - (String) Represents a Number data type
  #     * `:b` - (String) Represents a Binary data type
  #     * `:ss` - (Array<String>) Represents a String set data type
  #     * `:ns` - (Array<String>) Represents a Number set data type
  #     * `:bs` - (Array<String>) Represents a Binary set data type
  #   * `:expected` - (Hash<String,Hash>) A map of attribute/condition
  #     pairs. This is the conditional block for the PutItem operation. All
  #     the conditions must be met for the operation to succeed.
  #     * `:value` - (Hash) Specify whether or not a value already exists
  #       and has a specific content for the attribute name-value pair.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:exists` - (Boolean) Causes to evaluate the value before
  #       attempting a conditional operation: If Exists is `true` , will
  #       check to see if that attribute value already exists in the table.
  #       If it is found, then the operation succeeds. If it is not found,
  #       the operation fails with a ConditionalCheckFailedException. If
  #       Exists is `false` , assumes that the attribute value does not
  #       exist in the table. If in fact the value does not exist, then the
  #       assumption is valid and the operation succeeds. If the value is
  #       found, despite the assumption that it does not exist, the
  #       operation fails with a ConditionalCheckFailedException. The
  #       default setting for Exists is `true` . If you supply a Value all
  #       by itself, assumes the attribute exists: You don't have to set
  #       Exists to `true` , because it is implied. returns a
  #       ValidationException if: Exists is `true` but there is no Value to
  #       check. (You expect a value to exist, but don't specify what that
  #       value is.) Exists is `false` but you also specify a Value. (You
  #       cannot expect an attribute to have a value, while also expecting
  #       it not to exist.) If you specify more than one condition for
  #       Exists, then all of the conditions must evaluate to `true` . (In
  #       other words, the conditions are ANDed together.) Otherwise, the
  #       conditional operation will fail.
  #   * `:return_values` - (String) Use ReturnValues if you want to get the
  #     item attributes as they appeared before they were updated with the
  #     PutItem request. For PutItem, the valid values are: NONE - If
  #     ReturnValues is not specified, or if its value is NONE, then
  #     nothing is returned. (This is the default for ReturnValues.)
  #     ALL_OLD - If PutItem overwrote an attribute name-value pair, then
  #     the content of the old item is returned. Valid values include:
  #     * `NONE`
  #     * `ALL_OLD`
  #     * `UPDATED_OLD`
  #     * `ALL_NEW`
  #     * `UPDATED_NEW`
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `Attributes` - (Hash<String,Hash>)
  #     * `S` - (String)
  #     * `N` - (String)
  #     * `B` - (String)
  #     * `SS` - (Array<String>)
  #     * `NS` - (Array<String>)
  #     * `BS` - (Array<Blob>)
  #   * `ConsumedCapacityUnits` - (Numeric)

  # @!method query(options = {})
  # Calls the Query API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table
  #     containing the requested items.
  #   * `:attributes_to_get` - (Array<String>) You cannot use both
  #     AttributesToGet and Select together in a Query request, unless the
  #     value for Select is SPECIFIC_ATTRIBUTES. (This usage is equivalent
  #     to specifying AttributesToGet without any value for Select.)
  #   * `:limit` - (Integer)
  #   * `:consistent_read` - (Boolean)
  #   * `:count` - (Boolean) If set to `true` , Amazon DynamoDB returns a
  #     total number of items that match the query parameters, instead of a
  #     list of the matching items and their attributes. Do not set Count
  #     to `true` while providing a list of AttributesToGet, otherwise
  #     Amazon DynamoDB returns a validation error.
  #   * `:hash_key_value` - *required* - (Hash) Attribute value of the hash
  #     component of the composite primary key.
  #     * `:s` - (String) Represents a String data type
  #     * `:n` - (String) Represents a Number data type
  #     * `:b` - (String) Represents a Binary data type
  #     * `:ss` - (Array<String>) Represents a String set data type
  #     * `:ns` - (Array<String>) Represents a Number set data type
  #     * `:bs` - (Array<String>) Represents a Binary set data type
  #   * `:range_key_condition` - (Hash) A container for the attribute
  #     values and comparison operators to use for the query.
  #     * `:attribute_value_list` - (Array<Hash>) Represents one or more
  #       values to evaluate against the supplied attribute. This list
  #       contains exactly one value, except for a BETWEEN or IN
  #       comparison, in which case the list contains two values. For type
  #       Number, value comparisons are numeric. String value comparisons
  #       for greater than, equals, or less than are based on ASCII
  #       character code values. For example, a is greater than A, and aa
  #       is greater than B. For a list of code values, see
  #       http://en.wikipedia.org/wiki/ASCII#ASCII_printable_characters.
  #       For Binary, treats each byte of the binary data as unsigned when
  #       it compares binary values, for example when evaluating query
  #       expressions.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:comparison_operator` - *required* - (String) Represents a
  #       comparator for evaluating attributes. For example, equals,
  #       greater than, less than, etc. For information on specifying data
  #       types in JSON, see JSON Data Format . The following are
  #       descriptions of each comparison operator. EQ : Equal.
  #       AttributeValueList can contain only one AttributeValue of type
  #       String, Number, or Binary (not a set). If an item contains an
  #       AttributeValue of a different type than the one specified in the
  #       request, the value does not match. For example, {"S":"6"} does
  #       not equal {"N":"6"}. Also, {"N":"6"} does not equal {"NS":["6",
  #       "2", "1"]}. NE : Not equal. AttributeValueList can contain only
  #       one AttributeValue of type String, Number, or Binary (not a set).
  #       If an item contains an AttributeValue of a different type than
  #       the one specified in the request, the value does not match. For
  #       example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does
  #       not equal {"NS":["6", "2", "1"]}. LE : Less than or equal.
  #       AttributeValueList can contain only one AttributeValue of type
  #       String, Number, or Binary (not a set). If an item contains an
  #       AttributeValue of a different type than the one specified in the
  #       request, the value does not match. For example, {"S":"6"} does
  #       not equal {"N":"6"}. Also, {"N":"6"} does not compare to
  #       {"NS":["6", "2", "1"]}. LT : Less than. AttributeValueList can
  #       contain only one AttributeValue of type String, Number, or Binary
  #       (not a set). If an item contains an AttributeValue of a different
  #       type than the one specified in the request, the value does not
  #       match. For example, {"S":"6"} does not equal {"N":"6"}. Also,
  #       {"N":"6"} does not compare to {"NS":["6", "2", "1"]}. GE :
  #       Greater than or equal. AttributeValueList can contain only one
  #       AttributeValue of type String, Number, or Binary (not a set). If
  #       an item contains an AttributeValue of a different type than the
  #       one specified in the request, the value does not match. For
  #       example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does
  #       not compare to {"NS":["6", "2", "1"]}. GT : Greater than.
  #       AttributeValueList can contain only one AttributeValue of type
  #       String, Number, or Binary (not a set). If an item contains an
  #       AttributeValue of a different type than the one specified in the
  #       request, the value does not match. For example, {"S":"6"} does
  #       not equal {"N":"6"}. Also, {"N":"6"} does not compare to
  #       {"NS":["6", "2", "1"]}. NOT_NULL : The attribute exists. NULL :
  #       The attribute does not exist. CONTAINS : checks for a
  #       subsequence, or value in a set. AttributeValueList can contain
  #       only one AttributeValue of type String, Number, or Binary (not a
  #       set). If the target attribute of the comparison is a String, then
  #       the operation checks for a substring match. If the target
  #       attribute of the comparison is Binary, then the operation looks
  #       for a subsequence of the target that matches the input. If the
  #       target attribute of the comparison is a set ("SS", "NS", or
  #       "BS"), then the operation checks for a member of the set (not as
  #       a substring). NOT_CONTAINS : checks for absence of a subsequence,
  #       or absence of a value in a set. AttributeValueList can contain
  #       only one AttributeValue of type String, Number, or Binary (not a
  #       set). If the target attribute of the comparison is a String, then
  #       the operation checks for the absence of a substring match. If the
  #       target attribute of the comparison is Binary, then the operation
  #       checks for the absence of a subsequence of the target that
  #       matches the input. If the target attribute of the comparison is a
  #       set ("SS", "NS", or "BS"), then the operation checks for the
  #       absence of a member of the set (not as a substring). BEGINS_WITH
  #       : checks for a prefix. AttributeValueList can contain only one
  #       AttributeValue of type String or Binary (not a Number or a set).
  #       The target attribute of the comparison must be a String or Binary
  #       (not a Number or a set). IN : checks for exact matches.
  #       AttributeValueList can contain more than one AttributeValue of
  #       type String, Number, or Binary (not a set). The target attribute
  #       of the comparison must be of the same type and exact value to
  #       match. A String never matches a String set. BETWEEN : Greater
  #       than or equal to the first value, and less than or equal to the
  #       second value. AttributeValueList must contain two AttributeValue
  #       elements of the same type, either String, Number, or Binary (not
  #       a set). A target attribute matches if the target value is greater
  #       than, or equal to, the first element and less than, or equal to,
  #       the second element. If an item contains an AttributeValue of a
  #       different type than the one specified in the request, the value
  #       does not match. For example, {"S":"6"} does not compare to
  #       {"N":"6"}. Also, {"N":"6"} does not compare to {"NS":["6", "2",
  #       "1"]} Valid values include:
  #       * `EQ`
  #       * `NE`
  #       * `IN`
  #       * `LE`
  #       * `LT`
  #       * `GE`
  #       * `GT`
  #       * `BETWEEN`
  #       * `NOT_NULL`
  #       * `NULL`
  #       * `CONTAINS`
  #       * `NOT_CONTAINS`
  #       * `BEGINS_WITH`
  #   * `:scan_index_forward` - (Boolean) Specifies ascending ( `true` ) or
  #     descending ( `false` ) traversal of the index. returns results
  #     reflecting the requested order determined by the range key. If the
  #     data type is Number, the results are returned in numeric order. For
  #     String, the results are returned in order of ASCII character code
  #     values. For Binary, Amazon DynamoDB treats each byte of the binary
  #     data as unsigned when it compares binary values. If
  #     ScanIndexForward is not specified, the results are returned in
  #     ascending order.
  #   * `:exclusive_start_key` - (Hash)
  #     * `:hash_key_element` - *required* - (Hash) A hash key element is
  #       treated as the primary key, and can be a string or a number.
  #       Single attribute primary keys have one index value. The value can
  #       be String, Number, StringSet, NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:range_key_element` - (Hash) A range key element is treated as a
  #       secondary key (used in conjunction with the primary key), and can
  #       be a string or a number, and is only used for hash-and-range
  #       primary keys. The value can be String, Number, StringSet,
  #       NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `member` - (Hash<String,Hash>)
  #     * `S` - (String)
  #     * `N` - (String)
  #     * `B` - (String)
  #     * `SS` - (Array<String>)
  #     * `NS` - (Array<String>)
  #     * `BS` - (Array<Blob>)
  #   * `Count` - (Integer)
  #   * `LastEvaluatedKey` - (Hash)
  #     * `HashKeyElement` - (Hash)
  #       * `S` - (String)
  #       * `N` - (String)
  #       * `B` - (String)
  #       * `SS` - (Array<String>)
  #       * `NS` - (Array<String>)
  #       * `BS` - (Array<Blob>)
  #     * `RangeKeyElement` - (Hash)
  #       * `S` - (String)
  #       * `N` - (String)
  #       * `B` - (String)
  #       * `SS` - (Array<String>)
  #       * `NS` - (Array<String>)
  #       * `BS` - (Array<Blob>)
  #   * `ConsumedCapacityUnits` - (Numeric)

  # @!method scan(options = {})
  # Calls the Scan API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table
  #     containing the requested items.
  #   * `:attributes_to_get` - (Array<String>)
  #   * `:limit` - (Integer)
  #   * `:count` - (Boolean) If set to `true` , Amazon DynamoDB returns a
  #     total number of items for the Scan operation, even if the operation
  #     has no matching items for the assigned filter. Do not set Count to
  #     `true` while providing a list of AttributesToGet, otherwise Amazon
  #     DynamoDB returns a validation error.
  #   * `:scan_filter` - (Hash<String,Hash>) Evaluates the scan results and
  #     returns only the desired values. Multiple conditions are treated as
  #     "AND" operations: all conditions must be met to be included in the
  #     results. Each ScanConditions element consists of an attribute name
  #     to compare, along with the following: AttributeValueList - One or
  #     more values to evaluate against the supplied attribute. This list
  #     contains exactly one value, except for a BETWEEN or IN comparison,
  #     in which case the list contains two values. For type Number, value
  #     comparisons are numeric. String value comparisons for greater than,
  #     equals, or less than are based on ASCII character code values. For
  #     example, a is greater than A, and aa is greater than B. For a list
  #     of code values, see
  #     http://en.wikipedia.org/wiki/ASCII#ASCII_printable_characters. For
  #     Binary, treats each byte of the binary data as unsigned when it
  #     compares binary values, for example when evaluating query
  #     expressions. ComparisonOperator - A comparator for evaluating
  #     attributes. For example, equals, greater than, less than, etc. For
  #     information on specifying data types in JSON, see JSON Data Format
  #     . The following are descriptions of each comparison operator. EQ :
  #     Equal. AttributeValueList can contain only one AttributeValue of
  #     type String, Number, or Binary (not a set). If an item contains an
  #     AttributeValue of a different type than the one specified in the
  #     request, the value does not match. For example, {"S":"6"} does not
  #     equal {"N":"6"}. Also, {"N":"6"} does not equal {"NS":["6", "2",
  #     "1"]}. NE : Not equal. AttributeValueList can contain only one
  #     AttributeValue of type String, Number, or Binary (not a set). If an
  #     item contains an AttributeValue of a different type than the one
  #     specified in the request, the value does not match. For example,
  #     {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does not equal
  #     {"NS":["6", "2", "1"]}. LE : Less than or equal. AttributeValueList
  #     can contain only one AttributeValue of type String, Number, or
  #     Binary (not a set). If an item contains an AttributeValue of a
  #     different type than the one specified in the request, the value
  #     does not match. For example, {"S":"6"} does not equal {"N":"6"}.
  #     Also, {"N":"6"} does not compare to {"NS":["6", "2", "1"]}. LT :
  #     Less than. AttributeValueList can contain only one AttributeValue
  #     of type String, Number, or Binary (not a set). If an item contains
  #     an AttributeValue of a different type than the one specified in the
  #     request, the value does not match. For example, {"S":"6"} does not
  #     equal {"N":"6"}. Also, {"N":"6"} does not compare to {"NS":["6",
  #     "2", "1"]}. GE : Greater than or equal. AttributeValueList can
  #     contain only one AttributeValue of type String, Number, or Binary
  #     (not a set). If an item contains an AttributeValue of a different
  #     type than the one specified in the request, the value does not
  #     match. For example, {"S":"6"} does not equal {"N":"6"}. Also,
  #     {"N":"6"} does not compare to {"NS":["6", "2", "1"]}. GT : Greater
  #     than. AttributeValueList can contain only one AttributeValue of
  #     type String, Number, or Binary (not a set). If an item contains an
  #     AttributeValue of a different type than the one specified in the
  #     request, the value does not match. For example, {"S":"6"} does not
  #     equal {"N":"6"}. Also, {"N":"6"} does not compare to {"NS":["6",
  #     "2", "1"]}. NOT_NULL : The attribute exists. NULL : The attribute
  #     does not exist. CONTAINS : checks for a subsequence, or value in a
  #     set. AttributeValueList can contain only one AttributeValue of type
  #     String, Number, or Binary (not a set). If the target attribute of
  #     the comparison is a String, then the operation checks for a
  #     substring match. If the target attribute of the comparison is
  #     Binary, then the operation looks for a subsequence of the target
  #     that matches the input. If the target attribute of the comparison
  #     is a set ("SS", "NS", or "BS"), then the operation checks for a
  #     member of the set (not as a substring). NOT_CONTAINS : checks for
  #     absence of a subsequence, or absence of a value in a set.
  #     AttributeValueList can contain only one AttributeValue of type
  #     String, Number, or Binary (not a set). If the target attribute of
  #     the comparison is a String, then the operation checks for the
  #     absence of a substring match. If the target attribute of the
  #     comparison is Binary, then the operation checks for the absence of
  #     a subsequence of the target that matches the input. If the target
  #     attribute of the comparison is a set ("SS", "NS", or "BS"), then
  #     the operation checks for the absence of a member of the set (not as
  #     a substring). BEGINS_WITH : checks for a prefix. AttributeValueList
  #     can contain only one AttributeValue of type String or Binary (not a
  #     Number or a set). The target attribute of the comparison must be a
  #     String or Binary (not a Number or a set). IN : checks for exact
  #     matches. AttributeValueList can contain more than one
  #     AttributeValue of type String, Number, or Binary (not a set). The
  #     target attribute of the comparison must be of the same type and
  #     exact value to match. A String never matches a String set. BETWEEN
  #     : Greater than or equal to the first value, and less than or equal
  #     to the second value. AttributeValueList must contain two
  #     AttributeValue elements of the same type, either String, Number, or
  #     Binary (not a set). A target attribute matches if the target value
  #     is greater than, or equal to, the first element and less than, or
  #     equal to, the second element. If an item contains an AttributeValue
  #     of a different type than the one specified in the request, the
  #     value does not match. For example, {"S":"6"} does not compare to
  #     {"N":"6"}. Also, {"N":"6"} does not compare to {"NS":["6", "2",
  #     "1"]}
  #     * `:attribute_value_list` - (Array<Hash>) Represents one or more
  #       values to evaluate against the supplied attribute. This list
  #       contains exactly one value, except for a BETWEEN or IN
  #       comparison, in which case the list contains two values. For type
  #       Number, value comparisons are numeric. String value comparisons
  #       for greater than, equals, or less than are based on ASCII
  #       character code values. For example, a is greater than A, and aa
  #       is greater than B. For a list of code values, see
  #       http://en.wikipedia.org/wiki/ASCII#ASCII_printable_characters.
  #       For Binary, treats each byte of the binary data as unsigned when
  #       it compares binary values, for example when evaluating query
  #       expressions.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:comparison_operator` - *required* - (String) Represents a
  #       comparator for evaluating attributes. For example, equals,
  #       greater than, less than, etc. For information on specifying data
  #       types in JSON, see JSON Data Format . The following are
  #       descriptions of each comparison operator. EQ : Equal.
  #       AttributeValueList can contain only one AttributeValue of type
  #       String, Number, or Binary (not a set). If an item contains an
  #       AttributeValue of a different type than the one specified in the
  #       request, the value does not match. For example, {"S":"6"} does
  #       not equal {"N":"6"}. Also, {"N":"6"} does not equal {"NS":["6",
  #       "2", "1"]}. NE : Not equal. AttributeValueList can contain only
  #       one AttributeValue of type String, Number, or Binary (not a set).
  #       If an item contains an AttributeValue of a different type than
  #       the one specified in the request, the value does not match. For
  #       example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does
  #       not equal {"NS":["6", "2", "1"]}. LE : Less than or equal.
  #       AttributeValueList can contain only one AttributeValue of type
  #       String, Number, or Binary (not a set). If an item contains an
  #       AttributeValue of a different type than the one specified in the
  #       request, the value does not match. For example, {"S":"6"} does
  #       not equal {"N":"6"}. Also, {"N":"6"} does not compare to
  #       {"NS":["6", "2", "1"]}. LT : Less than. AttributeValueList can
  #       contain only one AttributeValue of type String, Number, or Binary
  #       (not a set). If an item contains an AttributeValue of a different
  #       type than the one specified in the request, the value does not
  #       match. For example, {"S":"6"} does not equal {"N":"6"}. Also,
  #       {"N":"6"} does not compare to {"NS":["6", "2", "1"]}. GE :
  #       Greater than or equal. AttributeValueList can contain only one
  #       AttributeValue of type String, Number, or Binary (not a set). If
  #       an item contains an AttributeValue of a different type than the
  #       one specified in the request, the value does not match. For
  #       example, {"S":"6"} does not equal {"N":"6"}. Also, {"N":"6"} does
  #       not compare to {"NS":["6", "2", "1"]}. GT : Greater than.
  #       AttributeValueList can contain only one AttributeValue of type
  #       String, Number, or Binary (not a set). If an item contains an
  #       AttributeValue of a different type than the one specified in the
  #       request, the value does not match. For example, {"S":"6"} does
  #       not equal {"N":"6"}. Also, {"N":"6"} does not compare to
  #       {"NS":["6", "2", "1"]}. NOT_NULL : The attribute exists. NULL :
  #       The attribute does not exist. CONTAINS : checks for a
  #       subsequence, or value in a set. AttributeValueList can contain
  #       only one AttributeValue of type String, Number, or Binary (not a
  #       set). If the target attribute of the comparison is a String, then
  #       the operation checks for a substring match. If the target
  #       attribute of the comparison is Binary, then the operation looks
  #       for a subsequence of the target that matches the input. If the
  #       target attribute of the comparison is a set ("SS", "NS", or
  #       "BS"), then the operation checks for a member of the set (not as
  #       a substring). NOT_CONTAINS : checks for absence of a subsequence,
  #       or absence of a value in a set. AttributeValueList can contain
  #       only one AttributeValue of type String, Number, or Binary (not a
  #       set). If the target attribute of the comparison is a String, then
  #       the operation checks for the absence of a substring match. If the
  #       target attribute of the comparison is Binary, then the operation
  #       checks for the absence of a subsequence of the target that
  #       matches the input. If the target attribute of the comparison is a
  #       set ("SS", "NS", or "BS"), then the operation checks for the
  #       absence of a member of the set (not as a substring). BEGINS_WITH
  #       : checks for a prefix. AttributeValueList can contain only one
  #       AttributeValue of type String or Binary (not a Number or a set).
  #       The target attribute of the comparison must be a String or Binary
  #       (not a Number or a set). IN : checks for exact matches.
  #       AttributeValueList can contain more than one AttributeValue of
  #       type String, Number, or Binary (not a set). The target attribute
  #       of the comparison must be of the same type and exact value to
  #       match. A String never matches a String set. BETWEEN : Greater
  #       than or equal to the first value, and less than or equal to the
  #       second value. AttributeValueList must contain two AttributeValue
  #       elements of the same type, either String, Number, or Binary (not
  #       a set). A target attribute matches if the target value is greater
  #       than, or equal to, the first element and less than, or equal to,
  #       the second element. If an item contains an AttributeValue of a
  #       different type than the one specified in the request, the value
  #       does not match. For example, {"S":"6"} does not compare to
  #       {"N":"6"}. Also, {"N":"6"} does not compare to {"NS":["6", "2",
  #       "1"]} Valid values include:
  #       * `EQ`
  #       * `NE`
  #       * `IN`
  #       * `LE`
  #       * `LT`
  #       * `GE`
  #       * `GT`
  #       * `BETWEEN`
  #       * `NOT_NULL`
  #       * `NULL`
  #       * `CONTAINS`
  #       * `NOT_CONTAINS`
  #       * `BEGINS_WITH`
  #   * `:exclusive_start_key` - (Hash) In a parallel scan, a Scan request
  #     that includes ExclusiveStartKey must specify the same segment whose
  #     previous Scan returned the corresponding value of LastEvaluatedKey.
  #     * `:hash_key_element` - *required* - (Hash) A hash key element is
  #       treated as the primary key, and can be a string or a number.
  #       Single attribute primary keys have one index value. The value can
  #       be String, Number, StringSet, NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:range_key_element` - (Hash) A range key element is treated as a
  #       secondary key (used in conjunction with the primary key), and can
  #       be a string or a number, and is only used for hash-and-range
  #       primary keys. The value can be String, Number, StringSet,
  #       NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `member` - (Hash<String,Hash>)
  #     * `S` - (String)
  #     * `N` - (String)
  #     * `B` - (String)
  #     * `SS` - (Array<String>)
  #     * `NS` - (Array<String>)
  #     * `BS` - (Array<Blob>)
  #   * `Count` - (Integer)
  #   * `ScannedCount` - (Integer)
  #   * `LastEvaluatedKey` - (Hash)
  #     * `HashKeyElement` - (Hash)
  #       * `S` - (String)
  #       * `N` - (String)
  #       * `B` - (String)
  #       * `SS` - (Array<String>)
  #       * `NS` - (Array<String>)
  #       * `BS` - (Array<Blob>)
  #     * `RangeKeyElement` - (Hash)
  #       * `S` - (String)
  #       * `N` - (String)
  #       * `B` - (String)
  #       * `SS` - (Array<String>)
  #       * `NS` - (Array<String>)
  #       * `BS` - (Array<Blob>)
  #   * `ConsumedCapacityUnits` - (Numeric)

  # @!method update_item(options = {})
  # Calls the UpdateItem API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table
  #     containing the item to update.
  #   * `:key` - *required* - (Hash) The primary key that defines the item.
  #     Each element consists of an attribute name and a value for that
  #     attribute.
  #     * `:hash_key_element` - *required* - (Hash) A hash key element is
  #       treated as the primary key, and can be a string or a number.
  #       Single attribute primary keys have one index value. The value can
  #       be String, Number, StringSet, NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:range_key_element` - (Hash) A range key element is treated as a
  #       secondary key (used in conjunction with the primary key), and can
  #       be a string or a number, and is only used for hash-and-range
  #       primary keys. The value can be String, Number, StringSet,
  #       NumberSet.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #   * `:attribute_updates` - *required* - (Hash<String,Hash>) The names
  #     of attributes to be modified, the action to perform on each, and
  #     the new value for each. If you are updating an attribute that is an
  #     index key attribute for any indexes on that table, the attribute
  #     type must match the index key type defined in the
  #     AttributesDefinition of the table description. You can use
  #     UpdateItem to update any non-key attributes. Attribute values
  #     cannot be null. String and binary type attributes must have lengths
  #     greater than zero. Set type attributes must not be empty. Requests
  #     with empty values will be rejected with a ValidationException. Each
  #     AttributeUpdates element consists of an attribute name to modify,
  #     along with the following: Value - The new value, if applicable, for
  #     this attribute. Action - Specifies how to perform the update. Valid
  #     values for Action are PUT, DELETE, and ADD. The behavior depends on
  #     whether the specified primary key already exists in the table. If
  #     an item with the specified Key is found in the table: PUT - Adds
  #     the specified attribute to the item. If the attribute already
  #     exists, it is replaced by the new value. DELETE - If no value is
  #     specified, the attribute and its value are removed from the item.
  #     The data type of the specified value must match the existing
  #     value's data type. If a set of values is specified, then those
  #     values are subtracted from the old set. For example, if the
  #     attribute value was the set [a,b,c] and the DELETE action specified
  #     [a,c], then the final attribute value would be [b]. Specifying an
  #     empty set is an error. ADD - If the attribute does not already
  #     exist, then the attribute and its values are added to the item. If
  #     the attribute does exist, then the behavior of ADD depends on the
  #     data type of the attribute: If the existing attribute is a number,
  #     and if Value is also a number, then the Value is mathematically
  #     added to the existing attribute. If Value is a negative number,
  #     then it is subtracted from the existing attribute. If you use ADD
  #     to increment or decrement a number value for an item that doesn't
  #     exist before the update, uses 0 as the initial value. In addition,
  #     if you use ADD to update an existing item, and intend to increment
  #     or decrement an attribute value which does not yet exist, uses 0 as
  #     the initial value. For example, suppose that the item you want to
  #     update does not yet have an attribute named itemcount, but you
  #     decide to ADD the number 3 to this attribute anyway, even though it
  #     currently does not exist. will create the itemcount attribute, set
  #     its initial value to 0, and finally add 3 to it. The result will be
  #     a new itemcount attribute in the item, with a value of 3. If the
  #     existing data type is a set, and if the Value is also a set, then
  #     the Value is added to the existing set. (This is a set operation,
  #     not mathematical addition.) For example, if the attribute value was
  #     the set [1,2], and the ADD action specified [3], then the final
  #     attribute value would be [1,2,3]. An error occurs if an Add action
  #     is specified for a set attribute and the attribute type specified
  #     does not match the existing set type. Both sets must have the same
  #     primitive data type. For example, if the existing data type is a
  #     set of strings, the Value must also be a set of strings. The same
  #     holds `true` for number sets and binary sets. This action is only
  #     valid for an existing attribute whose data type is number or is a
  #     set. Do not use ADD for any other data types. If no item with the
  #     specified Key is found: PUT - creates a new item with the specified
  #     primary key, and then adds the attribute. DELETE - Nothing happens;
  #     there is no attribute to delete. ADD - creates an item with the
  #     supplied primary key and number (or set of numbers) for the
  #     attribute value. The only data types allowed are number and number
  #     set; no other data types can be specified. If you specify any
  #     attributes that are part of an index key, then the data types for
  #     those attributes must match those of the schema in the table's
  #     attribute definition.
  #     * `:value` - (Hash)
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:action` - (String) Specifies how to perform the update. Valid
  #       values are PUT, DELETE, and ADD. The behavior depends on whether
  #       the specified primary key already exists in the table. If an item
  #       with the specified Key is found in the table: PUT - Adds the
  #       specified attribute to the item. If the attribute already exists,
  #       it is replaced by the new value. DELETE - If no value is
  #       specified, the attribute and its value are removed from the item.
  #       The data type of the specified value must match the existing
  #       value's data type. If a set of values is specified, then those
  #       values are subtracted from the old set. For example, if the
  #       attribute value was the set [a,b,c] and the DELETE action
  #       specified [a,c], then the final attribute value would be [b].
  #       Specifying an empty set is an error. ADD - If the attribute does
  #       not already exist, then the attribute and its values are added to
  #       the item. If the attribute does exist, then the behavior of ADD
  #       depends on the data type of the attribute: If the existing
  #       attribute is a number, and if Value is also a number, then the
  #       Value is mathematically added to the existing attribute. If Value
  #       is a negative number, then it is subtracted from the existing
  #       attribute. If you use ADD to increment or decrement a number
  #       value for an item that doesn't exist before the update, uses 0 as
  #       the initial value. In addition, if you use ADD to update an
  #       existing item, and intend to increment or decrement an attribute
  #       value which does not yet exist, uses 0 as the initial value. For
  #       example, suppose that the item you want to update does not yet
  #       have an attribute named itemcount, but you decide to ADD the
  #       number 3 to this attribute anyway, even though it currently does
  #       not exist. will create the itemcount attribute, set its initial
  #       value to 0, and finally add 3 to it. The result will be a new
  #       itemcount attribute in the item, with a value of 3. If the
  #       existing data type is a set, and if the Value is also a set, then
  #       the Value is added to the existing set. (This is a set operation,
  #       not mathematical addition.) For example, if the attribute value
  #       was the set [1,2], and the ADD action specified [3], then the
  #       final attribute value would be [1,2,3]. An error occurs if an Add
  #       action is specified for a set attribute and the attribute type
  #       specified does not match the existing set type. Both sets must
  #       have the same primitive data type. For example, if the existing
  #       data type is a set of strings, the Value must also be a set of
  #       strings. The same holds `true` for number sets and binary sets.
  #       This action is only valid for an existing attribute whose data
  #       type is number or is a set. Do not use ADD for any other data
  #       types. If no item with the specified Key is found: PUT - creates
  #       a new item with the specified primary key, and then adds the
  #       attribute. DELETE - Nothing happens; there is no attribute to
  #       delete. ADD - creates an item with the supplied primary key and
  #       number (or set of numbers) for the attribute value. The only data
  #       types allowed are number and number set; no other data types can
  #       be specified. Valid values include:
  #       * `ADD`
  #       * `PUT`
  #       * `DELETE`
  #   * `:expected` - (Hash<String,Hash>) A map of attribute/condition
  #     pairs. This is the conditional block for the UpdateItem operation.
  #     All the conditions must be met for the operation to succeed.
  #     * `:value` - (Hash) Specify whether or not a value already exists
  #       and has a specific content for the attribute name-value pair.
  #       * `:s` - (String) Represents a String data type
  #       * `:n` - (String) Represents a Number data type
  #       * `:b` - (String) Represents a Binary data type
  #       * `:ss` - (Array<String>) Represents a String set data type
  #       * `:ns` - (Array<String>) Represents a Number set data type
  #       * `:bs` - (Array<String>) Represents a Binary set data type
  #     * `:exists` - (Boolean) Causes to evaluate the value before
  #       attempting a conditional operation: If Exists is `true` , will
  #       check to see if that attribute value already exists in the table.
  #       If it is found, then the operation succeeds. If it is not found,
  #       the operation fails with a ConditionalCheckFailedException. If
  #       Exists is `false` , assumes that the attribute value does not
  #       exist in the table. If in fact the value does not exist, then the
  #       assumption is valid and the operation succeeds. If the value is
  #       found, despite the assumption that it does not exist, the
  #       operation fails with a ConditionalCheckFailedException. The
  #       default setting for Exists is `true` . If you supply a Value all
  #       by itself, assumes the attribute exists: You don't have to set
  #       Exists to `true` , because it is implied. returns a
  #       ValidationException if: Exists is `true` but there is no Value to
  #       check. (You expect a value to exist, but don't specify what that
  #       value is.) Exists is `false` but you also specify a Value. (You
  #       cannot expect an attribute to have a value, while also expecting
  #       it not to exist.) If you specify more than one condition for
  #       Exists, then all of the conditions must evaluate to `true` . (In
  #       other words, the conditions are ANDed together.) Otherwise, the
  #       conditional operation will fail.
  #   * `:return_values` - (String) Use ReturnValues if you want to get the
  #     item attributes as they appeared either before or after they were
  #     updated. For UpdateItem, the valid values are: NONE - If
  #     ReturnValues is not specified, or if its value is NONE, then
  #     nothing is returned. (This is the default for ReturnValues.)
  #     ALL_OLD - If UpdateItem overwrote an attribute name-value pair,
  #     then the content of the old item is returned. UPDATED_OLD - The old
  #     versions of only the updated attributes are returned. ALL_NEW - All
  #     of the attributes of the new version of the item are returned.
  #     UPDATED_NEW - The new versions of only the updated attributes are
  #     returned. Valid values include:
  #     * `NONE`
  #     * `ALL_OLD`
  #     * `UPDATED_OLD`
  #     * `ALL_NEW`
  #     * `UPDATED_NEW`
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `Attributes` - (Hash<String,Hash>)
  #     * `S` - (String)
  #     * `N` - (String)
  #     * `B` - (String)
  #     * `SS` - (Array<String>)
  #     * `NS` - (Array<String>)
  #     * `BS` - (Array<Blob>)
  #   * `ConsumedCapacityUnits` - (Numeric)

  # @!method update_table(options = {})
  # Calls the UpdateTable API operation.
  # @param [Hash] options
  #
  #   * `:table_name` - *required* - (String) The name of the table to be
  #     updated.
  #   * `:provisioned_throughput` - *required* - (Hash)
  #     * `:read_capacity_units` - *required* - (Integer) The maximum
  #       number of strongly consistent reads consumed per second before
  #       returns a ThrottlingException. For more information, see
  #       Specifying Read and Write Requirements .
  #     * `:write_capacity_units` - *required* - (Integer) The maximum
  #       number of writes consumed per second before returns a
  #       ThrottlingException. For more information, see Specifying Read
  #       and Write Requirements .
  # @return [Core::Response]
  #   The #data method of the response object returns
  #   a hash with the following structure:
  #
  #   * `TableDescription` - (Hash)
  #     * `TableName` - (String)
  #     * `KeySchema` - (Hash)
  #       * `HashKeyElement` - (Hash)
  #         * `AttributeName` - (String)
  #         * `AttributeType` - (String)
  #       * `RangeKeyElement` - (Hash)
  #         * `AttributeName` - (String)
  #         * `AttributeType` - (String)
  #     * `TableStatus` - (String)
  #     * `CreationDateTime` - (Time)
  #     * `ProvisionedThroughput` - (Hash)
  #       * `LastIncreaseDateTime` - (Time)
  #       * `LastDecreaseDateTime` - (Time)
  #       * `NumberOfDecreasesToday` - (Integer)
  #       * `ReadCapacityUnits` - (Integer)
  #       * `WriteCapacityUnits` - (Integer)
  #     * `TableSizeBytes` - (Integer)
  #     * `ItemCount` - (Integer)

  # end client methods #

  define_client_methods('2011-12-05')

end
