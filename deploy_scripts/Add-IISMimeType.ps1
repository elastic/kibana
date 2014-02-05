param(
  [Parameter(Mandatory=$true)][string] $mimeType,
  [Parameter(Mandatory=$true)][string] $mimeFileExtension
)
$mimeType = "application/json"
$mimeType_FileExtension = "json"

$mimePresent =  get-webconfigurationproperty //staticContent -name collection | Where { $_.mimeType -eq $mimeType -And $_.fileExtension -eq $mimeType_FileExtension }

if ( $mimePresent -eq $null)
{
	add-webconfigurationproperty //staticContent -name collection -value @{fileExtension=$mimeType_FileExtension; mimeType=$mimeType}
}
