require File.expand_path(File.join(File.dirname(__FILE__), "..", "namespace"))
require "cabin"

class RPM::File::Tag
  include Cabin::Inspectable

  attr_accessor :tag
  attr_accessor :type
  attr_accessor :offset
  attr_accessor :count
  attr_accessor :value

  # This data can be found mostly in rpmtag.h
  TAG = {
    61 => :headerimage,
    62 => :headersignatures,
    63 => :headerimmutable,
    64 => :headerregions,
    100 => :headeri18ntable,
    256 => :sig_base,

    257 => :sigsize,
    258 => :siglemd5_1,
    259 => :sigpgp,
    260 => :siglemd5_2,
    261 => :sigmd5,
    262 => :siggpg,
    263 => :sigpgp5,
    264 => :badsha1_1,
    265 => :badsha1_2,
    266 => :pubkeys,
    267 => :dsaheader,
    268 => :rsaheader,
    269 => :sha1header,
    270 => :longsigsize,
    271 => :longarchivesize,

    1000 => :name,
    1001 => :version,
    1002 => :release,
    1003 => :epoch,
    1004 => :summary,
    1005 => :description,
    1006 => :buildtime,
    1007 => :buildhost,
    1008 => :installtime,
    1009 => :size,
    1010 => :distribution,
    1011 => :vendor,
    1012 => :gif,
    1013 => :xpm,
    1014 => :license,
    1015 => :packager,
    1016 => :group,
    1017 => :changelog,
    1018 => :source,
    1019 => :patch,
    1020 => :url,
    1021 => :os,
    1022 => :arch,
    1023 => :prein,
    1024 => :postin,
    1025 => :preun,
    1026 => :postun,
    1027 => :oldfilenames,
    1028 => :filesizes,
    1029 => :filestates,
    1030 => :filemodes,
    1031 => :fileuids,
    1032 => :filegids,
    1033 => :filerdevs,
    1034 => :filemtimes,
    1035 => :filedigests,
    1036 => :filelinktos,
    1037 => :fileflags,
    1038 => :root,
    1039 => :fileusername,
    1040 => :filegroupname,
    1041 => :exclude,
    1042 => :exclusive,
    1043 => :icon,
    1044 => :sourcerpm,
    1045 => :fileverifyflags,
    1046 => :archivesize,
    1047 => :providename,
    1048 => :requireflags,
    1049 => :requirename,
    1050 => :requireversion,
    1051 => :nosource,
    1052 => :nopatch,
    1053 => :conflictflags,
    1054 => :conflictname,
    1055 => :conflictversion,
    1056 => :defaultprefix,
    1057 => :buildroot,
    1058 => :installprefix,
    1059 => :excludearch,
    1060 => :excludeos,
    1061 => :exclusivearch,
    1062 => :exclusiveos,
    1063 => :autoreqprov,
    1064 => :rpmversion,
    1065 => :triggerscripts,
    1066 => :triggername,
    1067 => :triggerversion,
    1068 => :triggerflags,
    1069 => :triggerindex,
    1079 => :verifyscript,
    1080 => :changelogtime,
    1081 => :changelogname,
    1082 => :changelogtext,
    1083 => :brokenmd5,
    1084 => :prereq,
    1085 => :preinprog,
    1086 => :postinprog,
    1087 => :preunprog,
    1088 => :postunprog,
    1089 => :buildarchs,
    1090 => :obsoletename,
    1091 => :verifyscriptprog,
    1092 => :triggerscriptprog,
    1093 => :docdir,
    1094 => :cookie,
    1095 => :filedevices,
    1096 => :fileinodes,
    1097 => :filelangs,
    1098 => :prefixes,
    1099 => :instprefixes,
    1100 => :triggerin,
    1101 => :triggerun,
    1102 => :triggerpostun,
    1103 => :autoreq,
    1104 => :autoprov,
    1105 => :capability,
    1106 => :sourcepackage,
    1107 => :oldorigfilenames,
    1108 => :buildprereq,
    1109 => :buildrequires,
    1110 => :buildconflicts,
    1111 => :buildmacros,
    1112 => :provideflags,
    1113 => :provideversion,
    1114 => :obsoleteflags,
    1115 => :obsoleteversion,
    1116 => :dirindexes,
    1117 => :basenames,
    1118 => :dirnames,
    1119 => :origdirindexes,
    1120 => :origbasenames,
    1121 => :origdirnames,
    1122 => :optflags,
    1123 => :disturl,
    1124 => :payloadformat,
    1125 => :payloadcompressor,
    1126 => :payloadflags,
    1127 => :installcolor,
    1128 => :installtid,
    1129 => :removetid,
    1130 => :sha1rhn,
    1131 => :rhnplatform,
    1132 => :platform,
    1133 => :patchesname,
    1134 => :patchesflags,
    1135 => :patchesversion,
    1136 => :cachectime,
    1137 => :cachepkgpath,
    1138 => :cachepkgsize,
    1139 => :cachepkgmtime,
    1140 => :filecolors,
    1141 => :fileclass,
    1142 => :classdict,
    1143 => :filedependsx,
    1144 => :filedependsn,
    1145 => :dependsdict,
    1146 => :sourcepkgid,
    1147 => :filecontexts,
    1148 => :fscontexts,
    1149 => :recontexts,
    1150 => :policies,
    1151 => :pretrans,
    1152 => :posttrans,
    1153 => :pretransprog,
    1154 => :posttransprog,
    1155 => :disttag,
    1156 => :suggestsname,
    1157 => :suggestsversion,
    1158 => :suggestsflags,
    1159 => :enhancesname,
    1160 => :enhancesversion,
    1161 => :enhancesflags,
    1162 => :priority,
    1163 => :cvsid,
    1164 => :blinkpkgid,
    1165 => :blinkhdrid,
    1166 => :blinknevra,
    1167 => :flinkpkgid,
    1168 => :flinkhdrid,
    1169 => :flinknevra,
    1170 => :packageorigin,
    1171 => :triggerprein,
    1172 => :buildsuggests,
    1173 => :buildenhances,
    1174 => :scriptstates,
    1175 => :scriptmetrics,
    1176 => :buildcpuclock,
    1177 => :filedigestalgos,
    1178 => :variants,
    1179 => :xmajor,
    1180 => :xminor,
    1181 => :repotag,
    1182 => :keywords,
    1183 => :buildplatforms,
    1184 => :packagecolor,
    1185 => :packageprefcolor,
    1186 => :xattrsdict,
    1187 => :filexattrsx,
    1188 => :depattrsdict,
    1189 => :conflictattrsx,
    1190 => :obsoleteattrsx,
    1191 => :provideattrsx,
    1192 => :requireattrsx,
    1193 => :buildprovides,
    1194 => :buildobsoletes,
    1195 => :dbinstance,
    1196 => :nvra,
    5000 => :filenames,
    5001 => :fileprovide,
    5002 => :filerequire,
    5003 => :fsnames,
    5004 => :fssizes,
    5005 => :triggerconds,
    5006 => :triggertype,
    5007 => :origfilenames,
    5008 => :longfilesizes,
    5009 => :longsize,
    5010 => :filecaps,
    5011 => :filedigestalgo,
    5012 => :bugurl,
    5013 => :evr,
    5014 => :nvr,
    5015 => :nevr,
    5016 => :nevra,
    5017 => :headercolor,
    5018 => :verbose,
    5019 => :epochnum,
  }

  # See 'rpmTagType' enum in rpmtag.h
  TYPE = {
    0 => :null,
    1 => :char,
    2 => :int8,
    3 => :int16,
    4 => :int32,
    5 => :int64,
    6 => :string,
    7 => :binary,
    8 => :string_array,
    9 => :i18nstring,
  }

  def initialize(tag_id, type, offset, count, data)
    @tag = tag_id
    @type = type
    @offset = offset
    @count = count

    @data = data

    @inspectables = [:@tag, :@type, :@offset, :@count, :@value]
  end # def initialize

  def tag
    TAG.fetch(@tag, @tag)
  end # def tag

  def tag_as_int
    @tag
  end

  def type
    TYPE.fetch(@type, @type)
  end # def type

  def value
    if !@value
      case type
        when :string
          # string at offset up to first null
          @value = @data[@offset .. -1][/^[^\0]+/]
        when :i18nstring
          # string at offset up to first null
          @value = @data[@offset .. -1][/^[^\0]+/]
        when :string_array
          @value = @data[@offset .. -1].split("\0")[0 ... @count]
        when :binary
          @value = @data[@offset, @count]
        when :int32
          @value = @data[@offset, 4 * count].unpack("N" * count)
        when :int16
          @value = @data[@offset, 2 * count].unpack("n" * count)
      end # case type
    end # if !@value

    return @value
  end # def value
end # class RPM::File::Tag
