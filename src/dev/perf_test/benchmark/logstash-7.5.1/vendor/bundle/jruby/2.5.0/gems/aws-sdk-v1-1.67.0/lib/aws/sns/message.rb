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

require 'base64'
require 'json'
require 'net/http'
require 'net/https'
require 'openssl'
require 'uri'

Dir.glob("#{File.dirname __FILE__}/originators/*.rb").each { |rb| require rb }

module AWS
  class SNS
    class MessageWasNotAuthenticError < StandardError
    end

    # Represents a single SNS message.
    #
    # See also http://docs.aws.amazon.com/sns/latest/gsg/json-formats.html
    #
    # = Originators
    # Originators are sources of SNS messages.  {FromAutoScaling} is one.  {Message}
    # can be extended by originators if their #applicable? method returns true when
    # passed the raw message.
    # Originator modules must implement `applicable? sns` module function.
    # If an originator is applicable, it should set the `@origin` accessor to denote
    # itself.
    class Message
      SIGNABLE_KEYS = [
        'Message',
        'MessageId',
        'Subject',
        'SubscribeURL',
        'Timestamp',
        'Token',
        'TopicArn',
        'Type',
      ].freeze

      attr_reader :raw
      attr_accessor :origin

      # @return {Message} Constructs a new {Message} from the raw SNS, sets origin
      def initialize sns
        if sns.is_a? String
          @raw = parse_from sns
        else
          @raw = sns
        end
        @origin = :sns
        self.extend FromAutoScaling if FromAutoScaling.applicable? @raw
      end

      # @param [String] key Indexer into raw SNS JSON message.
      # @return [String] the value of the SNS' field
      def [] key
        @raw[key]
      end

      # @return [Boolean] true when the {Message} is authentic:
      #   SigningCert is hosted at amazonaws.com, on https
      #   correctly cryptographically signed by sender
      #   nothing went wrong during authenticating the {Message}
      #
      # See http://docs.aws.amazon.com/sns/latest/gsg/SendMessageToHttp.verify.signature.html
      def authentic?
        begin
          decoded_from_base64 = decode signature
          public_key = get_public_key_from signing_cert_url
          public_key.verify OpenSSL::Digest::SHA1.new, decoded_from_base64, canonical_string
        rescue MessageWasNotAuthenticError
          false
        end
      end

      # @return[Symbol] the message type
      def type
        case when @raw['Type'] =~ /SubscriptionConfirmation/i
          then :SubscriptionConfirmation
        when @raw['Type'] =~ /Notification/i
          then :Notification
        when @raw['Type'] =~ /UnsubscribeConfirmation/i
          then :UnsubscribeConfirmation
        else
          :unknown
        end
      end

      def message_id
        @raw['MessageId']
      end

      def topic_arn
        @raw['TopicArn']
      end

      def subject
        @raw['Subject']
      end

      def message
        @raw['Message']
      end

      def timestamp
        @raw['Timestamp']
      end

      def signature
        @raw['Signature']
      end

      def signature_version
        @raw['SignatureVersion']
      end

      def signing_cert_url
        @raw['SigningCertURL']
      end

      def subscribe_url
        @raw['SubscribeURL']
      end

      def token
        @raw['Token']
      end

      def unsubscribe_url
        @raw['UnsubscribeURL']
      end

      def parse_from json
        JSON.parse json
      end

      protected
      def decode raw
        Base64.decode64 raw
      end

      def get_public_key_from(x509_pem_url)
        cert_pem = download x509_pem_url
        x509 = OpenSSL::X509::Certificate.new(cert_pem)
        OpenSSL::PKey::RSA.new(x509.public_key)
      end

      def canonical_string
        text = ''
        SIGNABLE_KEYS.each do |key|
          value = @raw[key]
          next if value.nil? or value.empty?
          text << key << "\n"
          text << value << "\n"
        end
        text
      end

      def download url
        uri = URI.parse(url)
        unless
          uri.scheme == 'https' &&
          uri.host.match(/^sns\.[a-zA-Z0-9\-]{3,}\.amazonaws\.com(\.cn)?$/) &&
          File.extname(uri.path) == '.pem'
        then
          msg = "cert is not hosted at AWS URL (https): #{url}"
          raise MessageWasNotAuthenticError, msg
        end
        tries = 0
        begin
          resp = https_get(url)
          resp.body
        rescue => error
          tries += 1
          retry if tries < 3
          raise error
        end
      end

      def https_get(url)
        uri = URI.parse(url)
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.verify_mode = OpenSSL::SSL::VERIFY_PEER
        http.start
        resp = http.request(Net::HTTP::Get.new(uri.request_uri))
        http.finish
        resp
      end

    end
  end
end
